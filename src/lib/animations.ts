/**
 * Framer Motion animation variants — Landing Page Smartly Assistant
 * Reusable transition patterns for consistent motion design.
 */
import type { Variants } from 'framer-motion'

// ─── Fade In from Below ──────────────────────────────────────────────────
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

// ─── Fade In from Left ───────────────────────────────────────────────────
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

// ─── Fade In from Right ──────────────────────────────────────────────────
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
}

// ─── Scale In ────────────────────────────────────────────────────────────
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

// ─── Stagger Container (parent) ──────────────────────────────────────────
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

// ─── Stagger Item (child) ───────────────────────────────────────────────
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
}

// ─── Viewport-triggered variants ─────────────────────────────────────────
export const viewportOnce = {
  once: true,
  margin: '-80px' as const,
}

// ─── Counter animation helper ────────────────────────────────────────────
export const counterVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

// ─── Floating animation (for hero mockup) ───────────────────────────────
export const float: Variants = {
  animate: {
    y: [0, -12, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

// ─── Gradient shift (hero background) ────────────────────────────────────
export const gradientShift = {
  animate: {
    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

// ─── Pulse glow ──────────────────────────────────────────────────────────
export const pulseGlow: Variants = {
  animate: {
    boxShadow: [
      '0 0 20px rgba(249,115,22,0.3)',
      '0 0 40px rgba(249,115,22,0.5)',
      '0 0 20px rgba(249,115,22,0.3)',
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}
