'use server'

import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signIn, signOut, auth } from '@/auth'
import { z } from 'zod'

const SALT_ROUNDS = 12

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

interface AuthActionResult {
  success: boolean
  error?: string
  message?: string
}

// ─────────────────────────────────────────────
// Login Action
// ─────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

export async function loginUser(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    let callbackUrl = (formData.get('callbackUrl') as string) || ''
    // If no callbackUrl or it points to public pages, redirect to dashboard
    if (!callbackUrl || callbackUrl === '/' || callbackUrl === '/auth/login' || callbackUrl === '/auth/admin') {
      callbackUrl = '/?showLanding=false'
    }

    // Validate input
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message }
    }

    // Check if user exists and is active
    const user = await db.authUser.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user || !user.password) {
      return {
        success: false,
        error: 'Email ou mot de passe incorrect',
      }
    }

    if (!user.isActive) {
      return {
        success: false,
        error: 'Votre compte a été désactivé. Contactez un administrateur.',
      }
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return {
        success: false,
        error: 'Email ou mot de passe incorrect',
      }
    }

    // Sign in
    await signIn('credentials', {
      email: user.email,
      password,
      redirectTo: callbackUrl,
    })

    return { success: true, message: 'Connexion réussie' }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    // NextAuth redirects throw an error, that's expected
    if (msg.includes('NEXT_REDIRECT')) {
      throw error
    }

    // Handle specific NextAuth errors
    if (error && typeof error === 'object' && 'type' in error && (error as { type: string }).type === 'CredentialsSignin') {
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    console.error('Login error:', error)
    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    }
  }
}

// ─────────────────────────────────────────────
// Register Action (Invitation-Based)
// ─────────────────────────────────────────────

const registerSchema = z
  .object({
    token: z.string().min(1, 'Token d\'invitation requis'),
    name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    password: z
      .string()
      .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
      .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
      .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
    confirmPassword: z.string().min(1, 'Veuillez confirmer votre mot de passe'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

export async function registerUser(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const token = formData.get('token') as string
    const name = formData.get('name') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    // Validate input
    const result = registerSchema.safeParse({
      token,
      name,
      password,
      confirmPassword,
    })
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message }
    }

    // Validate invitation token
    const invitation = await db.invitation.findUnique({
      where: { token },
      include: { AuthUser_Invitation_invitedByToAuthUser: true },
    })

    if (!invitation) {
      return {
        success: false,
        error: 'Token d\'invitation invalide',
      }
    }

    if (invitation.usedAt || invitation.usedBy) {
      return {
        success: false,
        error: 'Cette invitation a déjà été utilisée',
      }
    }

    if (new Date() > invitation.expiresAt) {
      return {
        success: false,
        error: 'Cette invitation a expiré',
      }
    }

    // Check if user already exists
    const existingUser = await db.authUser.findUnique({
      where: { email: invitation.email },
    })

    if (existingUser) {
      return {
        success: false,
        error: 'Un compte avec cet email existe déjà',
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

    // Create user and mark invitation as used in a transaction
    await db.$transaction(async (tx) => {
      const newUser = await tx.authUser.create({
        data: {
          id: crypto.randomBytes(12).toString('hex'),
          email: invitation.email,
          name,
          password: hashedPassword,
          role: invitation.role,
          airportCode: invitation.airportCode,
          updatedAt: new Date(),
        },
      })

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          usedBy: newUser.id,
          usedAt: new Date(),
        },
      })
    })

    return {
      success: true,
      message: 'Compte créé avec succès ! Vous pouvez maintenant vous connecter.',
    }
  } catch (error: unknown) {
    console.error('Register error:', error)
    return {
      success: false,
      error: 'Une erreur est survenue lors de la création du compte.',
    }
  }
}

// ─────────────────────────────────────────────
// Create Invitation Action (Admin)
// ─────────────────────────────────────────────

const invitationSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.enum(['SUPERADMIN', 'AIRPORT_ADMIN', 'AGENT', 'VIEWER'], {
    message: 'Rôle invalide',
  }),
  airportCode: z.string().optional(),
})

export async function createInvitation(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  try {
    // ─── AUTH CHECK — Only SUPERADMIN or AIRPORT_ADMIN can invite ───
    const session = await auth()
    if (!session?.user) {
      return { success: false, error: 'Vous devez être connecté pour créer une invitation.' }
    }
    const userRole = (session.user as any)?.role as string | undefined
    if (userRole !== 'SUPERADMIN' && userRole !== 'AIRPORT_ADMIN') {
      return { success: false, error: 'Seuls les administrateurs peuvent créer des invitations.' }
    }

    const email = (formData.get('email') as string)?.toLowerCase()
    const role = formData.get('role') as string
    const airportCode = (formData.get('airportCode') as string) || null

    // Validate input
    const result = invitationSchema.safeParse({ email, role, airportCode })
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message }
    }

    // Non-SUPERADMIN cannot create SUPERADMIN invitations
    if (role === 'SUPERADMIN' && userRole !== 'SUPERADMIN') {
      return { success: false, error: 'Seul le SUPERADMIN peut créer des comptes SUPERADMIN.' }
    }

    // Check if invitation already exists for this email
    const existingInvitation = await db.invitation.findUnique({
      where: { email },
    })

    if (existingInvitation && !existingInvitation.usedAt) {
      return {
        success: false,
        error: 'Une invitation est déjà en attente pour cet email',
      }
    }

    // Check if user already exists
    const existingUser = await db.authUser.findUnique({
      where: { email },
    })

    if (existingUser) {
      return {
        success: false,
        error: 'Un compte avec cet email existe déjà',
      }
    }

    // Generate invitation token
    const token = `inv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`

    // Create invitation (expires in 7 days)
    await db.invitation.create({
      data: {
        id: crypto.randomBytes(12).toString('hex'),
        email,
        token,
        role: role as 'SUPERADMIN' | 'AIRPORT_ADMIN' | 'AGENT' | 'VIEWER',
        airportCode,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    return {
      success: true,
      message: `Invitation envoyée à ${email}`,
    }
  } catch (error: unknown) {
    console.error('Create invitation error:', error)
    return {
      success: false,
      error: 'Une erreur est survenue lors de la création de l\'invitation.',
    }
  }
}

// ─────────────────────────────────────────────
// Logout Action
// ─────────────────────────────────────────────

export async function logoutUser(): Promise<AuthActionResult> {
  try {
    await signOut({ redirectTo: '/' })
    return { success: true }
  } catch (error: unknown) {
    console.error('Logout error:', error)
    return { success: false, error: 'Erreur lors de la déconnexion' }
  }
}

// ─────────────────────────────────────────────
// Validate Invitation Token (for registration page)
// ─────────────────────────────────────────────

export async function validateInvitationToken(
  token: string
): Promise<{ valid: boolean; email?: string; role?: string; airportCode?: string; error?: string }> {
  try {
    if (!token) {
      return { valid: false, error: 'Token manquant' }
    }

    const invitation = await db.invitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return { valid: false, error: 'Token d\'invitation invalide' }
    }

    if (invitation.usedAt || invitation.usedBy) {
      return { valid: false, error: 'Cette invitation a déjà été utilisée' }
    }

    if (new Date() > invitation.expiresAt) {
      return { valid: false, error: 'Cette invitation a expiré' }
    }

    return {
      valid: true,
      email: invitation.email,
      role: invitation.role,
      airportCode: invitation.airportCode || undefined,
    }
  } catch (error: unknown) {
    console.error('Validate token error:', error)
    return { valid: false, error: 'Erreur lors de la validation du token' }
  }
}

// ─────────────────────────────────────────────
// Partner Login Action
// ─────────────────────────────────────────────

const partnerLoginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
})

export async function loginPartner(
  _prevState: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  try {
    const email = (formData.get('email') as string)?.toLowerCase()
    const password = formData.get('password') as string

    // Validate input
    const result = partnerLoginSchema.safeParse({ email, password })
    if (!result.success) {
      return { success: false, error: result.error.issues[0].message }
    }

    // Find partner user by email
    const partnerUser = await db.partnerUser.findUnique({
      where: { email },
      include: { Partner: true },
    })

    if (!partnerUser || !partnerUser.password) {
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    if (!partnerUser.isActive) {
      return { success: false, error: 'Votre compte a été désactivé. Contactez un administrateur.' }
    }

    if (!partnerUser.Partner?.isActive) {
      return { success: false, error: 'Votre organisation partenaire a été désactivée.' }
    }

    // Verify password
    const isValid = await bcrypt.compare(password, partnerUser.password)
    if (!isValid) {
      return { success: false, error: 'Email ou mot de passe incorrect' }
    }

    // Update last login
    await db.partnerUser.update({
      where: { id: partnerUser.id },
      data: { lastLogin: new Date() },
    })

    // Store partner session info in a lightweight JWT-style approach
    // Since partners use a different model, we use NextAuth signIn with custom user mapping
    // For now, we'll store minimal session data
    await signIn('credentials', {
      email: partnerUser.email,
      password,
      redirectTo: '/?showLanding=false&activeModule=partners', // partner login goes to partners module
    })

    return { success: true, message: 'Connexion réussie' }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    if (msg.includes('NEXT_REDIRECT')) {
      throw error
    }
    console.error('Partner login error:', error)
    return {
      success: false,
      error: 'Une erreur est survenue. Veuillez réessayer.',
    }
  }
}
