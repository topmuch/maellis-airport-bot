'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Mail,
  MessageCircle,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  User,
  FileText,
  HelpCircle,
} from 'lucide-react'
import { AuthInput } from '@/components/ui/AuthInput'
import { AuthButton } from '@/components/ui/AuthButton'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { fadeInUp, staggerContainer, staggerItem, viewportOnce } from '@/lib/animations'

// ─── Form Schema ──────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  email: z.string().email('Veuillez entrer une adresse email valide'),
  subject: z.enum(['Partenariat', 'Support Technique', 'Commercial', 'Presse', 'Autre'], {
    error: 'Veuillez sélectionner un sujet',
  }),
  message: z
    .string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(2000, 'Le message ne peut pas dépasser 2000 caractères'),
  consent: z.literal(true, {
    error: 'Vous devez accepter la politique de confidentialité',
  }),
})

type ContactFormData = z.infer<typeof contactSchema>

// ─── Contact Info Data ────────────────────────────────────────────────────

const contactInfoItems = [
  {
    icon: Mail,
    label: 'Email',
    value: 'contact@smartly.aero',
    href: 'mailto:contact@smartly.aero',
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp Business',
    value: '+221 33 869 69 70',
    href: 'https://wa.me/221338696970',
  },
  {
    icon: MapPin,
    label: 'Adresse',
    value: 'Aéroport International Blaise Diagne, Dakar, Sénégal',
    href: null,
  },
  {
    icon: Clock,
    label: 'Horaires support',
    value: 'Lun-Ven 8h-18h (GMT), Sam 9h-13h',
    href: null,
  },
]

// ─── Contact Content Component ────────────────────────────────────────────

export function ContactContent() {
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      subject: undefined,
      message: '',
      consent: undefined as unknown as true,
    },
  })

  const onSubmit = async (data: ContactFormData) => {
    setSubmitStatus('idle')
    setErrorMessage('')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setSubmitStatus('success')
        reset()
      } else {
        setSubmitStatus('error')
        setErrorMessage(result.error || 'Une erreur est survenue. Veuillez réessayer.')
      }
    } catch {
      setSubmitStatus('error')
      setErrorMessage('Erreur de connexion. Veuillez vérifier votre connexion internet.')
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-black">
      {/* Decorative Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-orange-500/10 blur-[128px]" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-teal-500/10 blur-[128px]" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-orange-500/5 blur-[96px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        {/* Back to home */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l&apos;accueil
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="mb-14 text-center"
        >
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Contactez l&apos;équipe{' '}
            <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
              Smartly
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-400 sm:text-lg">
            Nous sommes là pour vous aider. Envoyez-nous un message et nous répondrons sous 24h.
          </p>
        </motion.div>

        {/* Two-column grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="grid gap-8 lg:grid-cols-2 lg:gap-12"
        >
          {/* ── Left Column — Contact Form ───────────────────────────── */}
          <motion.div variants={staggerItem}>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              {/* Form header */}
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
                  <Send className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Envoyez un message</h2>
                  <p className="text-sm text-slate-400">
                    Remplissez le formulaire ci-dessous
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {/* Name */}
                <AuthInput
                  {...register('name')}
                  label="Nom"
                  placeholder="Votre nom complet"
                  icon={User}
                  error={errors.name?.message}
                />

                {/* Email */}
                <AuthInput
                  {...register('email')}
                  type="email"
                  label="Email"
                  placeholder="vous@entreprise.com"
                  icon={Mail}
                  error={errors.email?.message}
                />

                {/* Subject select */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <HelpCircle className="h-4 w-4 text-slate-400" />
                    Sujet
                  </label>
                  <Controller
                    name="subject"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full h-11 rounded-xl border-slate-700 bg-slate-800/50 text-sm text-slate-200 hover:border-slate-600 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                          <SelectValue placeholder="Sélectionnez un sujet" />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-slate-800/95 backdrop-blur-xl">
                          <SelectItem value="Partenariat">Partenariat</SelectItem>
                          <SelectItem value="Support Technique">
                            Support Technique
                          </SelectItem>
                          <SelectItem value="Commercial">Commercial</SelectItem>
                          <SelectItem value="Presse">Presse</SelectItem>
                          <SelectItem value="Autre">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.subject && (
                    <p className="text-xs text-red-400">{errors.subject.message}</p>
                  )}
                </div>

                {/* Message textarea */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <FileText className="h-4 w-4 text-slate-400" />
                    Message
                  </label>
                  <Textarea
                    {...register('message')}
                    placeholder="Décrivez votre demande en détail..."
                    className="min-h-[120px] rounded-xl border-slate-700 bg-slate-800/50 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 hover:border-slate-600 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                  {errors.message && (
                    <p className="text-xs text-red-400">{errors.message.message}</p>
                  )}
                </div>

                {/* RGPD consent checkbox */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" {...register('consent')} className="sr-only" />
                    <Checkbox
                      id="contact-consent"
                      className="mt-0.5 border-slate-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                      onCheckedChange={(checked: boolean | 'indeterminate') => {
                        setValue('consent', (checked === true) as unknown as true, { shouldValidate: true })
                      }}
                    />
                    <Label
                      htmlFor="contact-consent"
                      className="text-sm font-normal leading-snug text-slate-400 cursor-pointer"
                    >
                      J&apos;accepte que mes données soient traitées conformément à la{' '}
                      <Link
                        href="/privacy"
                        className="text-orange-400 hover:text-orange-300 underline underline-offset-2 transition-colors"
                      >
                        Politique de Confidentialité
                      </Link>
                    </Label>
                  </div>
                  {errors.consent && (
                    <p className="text-xs text-red-400">{errors.consent.message}</p>
                  )}
                </div>

                {/* Submit */}
                <div className="pt-2">
                  <AuthButton type="submit" loading={isSubmitting} size="lg" className="w-full">
                    Envoyer le message
                  </AuthButton>
                </div>
              </form>

              {/* Success state */}
              {submitStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"
                >
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                  <p className="text-sm text-emerald-400">
                    Message envoyé avec succès ! Nous vous répondrons sous 24h.
                  </p>
                </motion.div>
              )}

              {/* Error state */}
              {submitStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4"
                >
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                  <p className="text-sm text-red-400">{errorMessage}</p>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* ── Right Column — Contact Info ──────────────────────────── */}
          <motion.div variants={staggerItem} className="flex flex-col gap-6">
            {/* Coordinates card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/25">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Nos coordonnées</h2>
                  <p className="text-sm text-slate-400">Plusieurs moyens de nous joindre</p>
                </div>
              </div>

              <div className="space-y-5">
                {contactInfoItems.map((item) => {
                  const Icon = item.icon
                  const inner = (
                    <div className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-white/10 hover:bg-white/[0.04]">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800/80">
                        <Icon className="h-5 w-5 text-orange-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm text-slate-200 break-words">{item.value}</p>
                      </div>
                    </div>
                  )

                  if (item.href) {
                    return (
                      <a
                        key={item.label}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {inner}
                      </a>
                    )
                  }

                  return <div key={item.label}>{inner}</div>
                })}
              </div>
            </div>

            {/* Response time card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/25">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Délai de réponse</h2>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-400">
                Notre équipe s&apos;engage à répondre à toutes les demandes dans un délai de{' '}
                <span className="font-semibold text-orange-400">24 heures ouvrées</span>. Pour les
                urgences, utilisez notre numéro WhatsApp pour une réponse plus rapide.
              </p>
            </div>

            {/* Location card */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 shadow-lg shadow-teal-500/25">
                  <MapPin className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Notre localisation</h2>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-400">
                Smartly est basée à l&apos;Aéroport International Blaise Diagne (AIBD) de Dakar,
                Sénégal. Nous opérons dans les principaux aéroports d&apos;Afrique de l&apos;Ouest.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
