import React from 'react';
import { Document, Page, View, Text, StyleSheet, renderToFile } from '@react-pdf/renderer';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { styles, colors } from './brochure-styles';

// ====== PAGE 1: COVER ======
function CoverPage() {
  return (
    <Page size="A4" style={styles.coverPage}>
      {/* Background layers */}
      <View style={styles.coverGradientTop} />
      <View style={styles.coverGradientOverlay} />

      {/* Decorative circles */}
      <View
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 80,
          left: -40,
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: 'rgba(13, 148, 136, 0.12)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 120,
          left: 60,
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
        }}
      />

      {/* Main content */}
      <View style={styles.coverContent}>
        <View style={{ marginBottom: 10 }}>
          <Text style={{ fontSize: 28, color: '#D1FAE5', letterSpacing: 6 }}>✈</Text>
        </View>
        <Text style={styles.coverLogo}>MAELLIS</Text>
        <View style={styles.coverDivider} />
        <Text style={styles.coverSubtitle}>Assistant Aéroport Intelligent</Text>
        <Text style={styles.coverTagline}>
          La solution WhatsApp pour les aéroports africains
        </Text>
        <Text style={styles.coverTagline}>
          Recherche de vols • Suivi en temps réel • QR Bagage • Transport • Paiement mobile
        </Text>
      </View>

      {/* Bottom bar */}
      <View style={styles.coverBottomBar} />

      {/* Footer */}
      <View style={styles.coverFooter}>
        <Text style={styles.coverFooter}>Document commercial — Confidentiel</Text>
        <Text style={styles.coverYear}>© 2025 MAELLIS Technologies</Text>
      </View>
    </Page>
  );
}

// ====== PAGE 2: LE PROBLÈME ======
function ProblemPage() {
  const challenges = [
    { icon: '⏳', text: 'Longues files d\'attente aux guichets d\'enregistrement et d\'information' },
    { icon: '📱', text: 'Information de vol inaccessible ou retardée — pas de notifications en temps réel' },
    { icon: '🧳', text: 'Perte de bagages fréquente avec un suivi quasi inexistant dans les aéroports' },
    { icon: '🚕', text: 'Manque de transport structuré entre l\'aéroport et les zones urbaines' },
    { icon: '💳', text: 'Absence de paiement mobile intégré pour les services aéroportuaires' },
    { icon: '🌐', text: 'Barrières linguistiques avec une clientèle multilingue (FR, EN, Wolof, Arabe)' },
  ];

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Le Défi des Aéroports Africains</Text>
        <Text style={styles.headerSubtitle}>Des défis réels qui impactent des millions de passagers chaque année</Text>
      </View>
      <View style={styles.headerAccentBar} />

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.sectionSubtitle}>
          Les aéroports africains font face à des défis uniques qui entravent l&apos;expérience voyageur
          et limitent la croissance du trafic aérien sur le continent.
        </Text>

        <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginBottom: 12 }}>
          Les principaux défis identifiés :
        </Text>

        {challenges.map((c, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bulletIcon}>{c.icon}</Text>
            <Text style={styles.bulletText}>{c.text}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Key Statistic */}
        <View style={styles.statCard}>
          <Text style={styles.statValue}>80%</Text>
          <Text style={styles.statLabel}>
            des passagers africains utilisent WhatsApp comme principal canal de communication.
            Le besoin d&apos;une solution intégrée directement dans WhatsApp est critique.
          </Text>
        </View>

        <View style={{ ...styles.statCard, borderLeftColor: colors.secondary, marginTop: 12, backgroundColor: colors.teal50 }}>
          <Text style={{ ...styles.statValue, color: colors.secondary }}>2.5x</Text>
          <Text style={styles.statLabel}>
            La croissance du trafic aérien en Afrique prévue d&apos;ici 2035.
            Les infrastructures doivent évoluer pour répondre à cette demande exponentielle.
          </Text>
        </View>

        <View style={{ ...styles.statCard, borderLeftColor: colors.amber500, marginTop: 12, backgroundColor: colors.amber100 }}>
          <Text style={{ ...styles.statValue, color: colors.amber500, fontSize: 22 }}>45 min</Text>
          <Text style={styles.statLabel}>
            Temps moyen perdu par passager dans les files d&apos;attente.
            MAELLIS réduit ce temps de 60% grâce à l&apos;automatisation.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>MAELLIS</Text>
        <Text style={styles.footerText}>Brochure Commerciale 2025</Text>
        <Text style={styles.footerText}>Page 2 / 7</Text>
      </View>
    </Page>
  );
}

// ====== PAGE 3: LA SOLUTION ======
function SolutionPage() {
  const features = [
    { icon: '✈️', title: 'Recherche de Vols', desc: 'Recherche en temps réel de vols domestiques et internationaux avec filtres avancés.' },
    { icon: '📍', title: 'Suivi de Vol', desc: 'Portes, terminaux, retards, annulations — toutes les infos en un seul message WhatsApp.' },
    { icon: '🧳', title: 'QR Code Bagage', desc: 'Génération et suivi sécurisé de bagages avec QR code unique scanable.' },
    { icon: '🛋️', title: 'Réservation Salon VIP', desc: 'Réservation instantanée de salons VIP avec paiement mobile intégré.' },
    { icon: '🚕', title: 'Transport & Taxi', desc: 'Booking de taxi, navette et véhicule privé depuis et vers l\'aéroport.' },
    { icon: '💳', title: 'Paiement Mobile', desc: 'Orange Money, Wave, MTN MoMo — tous les opérateurs africains supportés.' },
  ];

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MAELLIS : Votre Assistant 24h/24</Text>
        <Text style={styles.headerSubtitle}>Un chatbot intelligent qui transforme l'expérience aéroportuaire via WhatsApp</Text>
      </View>
      <View style={styles.headerAccentBar} />

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.sectionSubtitle}>
          MAELLIS est un assistant virtuel intégré à WhatsApp, propulsé par l&apos;intelligence artificielle,
          conçu spécifiquement pour les aéroports africains. Il offre une expérience conversationnelle
          fluide en 4 langues et couvre l&apos;ensemble du parcours voyageur.
        </Text>

        <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginBottom: 14 }}>
          Fonctionnalités clés :
        </Text>

        <View style={styles.featureGrid}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />

        {/* How it works */}
        <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginBottom: 10 }}>
          Comment ça fonctionne ?
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, alignItems: 'center', padding: '12 8', backgroundColor: colors.emerald50, borderRadius: 6 }}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>💬</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.gray800, textAlign: 'center' }}>1. Le passager envoie un message WhatsApp</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', padding: '12 8', backgroundColor: colors.teal50, borderRadius: 6 }}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>🤖</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.gray800, textAlign: 'center' }}>2. L&apos;IA analyse et comprend la demande</Text>
          </View>
          <View style={{ flex: 1, alignItems: 'center', padding: '12 8', backgroundColor: colors.emerald50, borderRadius: 6 }}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>✅</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.gray800, textAlign: 'center' }}>3. Réponse instantanée avec données temps réel</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>MAELLIS</Text>
        <Text style={styles.footerText}>Brochure Commerciale 2025</Text>
        <Text style={styles.footerText}>Page 3 / 7</Text>
      </View>
    </Page>
  );
}

// ====== PAGE 4: ARCHITECTURE TECHNIQUE ======
function ArchitecturePage() {
  const techStack = [
    { name: 'Meta WhatsApp Cloud API', desc: 'Canal de communication principal — API officielle Meta' },
    { name: 'Groq AI (Llama-3)', desc: 'IA conversationnelle pour la compréhension du langage naturel' },
    { name: 'AviationStack API', desc: 'Données de vol en temps réel — horaires, portes, statuts' },
    { name: 'CinetPay', desc: 'Paiement mobile intégré — Orange Money, Wave, MTN MoMo' },
    { name: 'Next.js 16', desc: 'Dashboard d\'administration et tableau de bord temps réel' },
    { name: 'PostgreSQL + Redis', desc: 'Base de données relationnelle + cache haute performance' },
    { name: 'Docker', desc: 'Déploiement containerisé — reproductible et scalable' },
    { name: 'Prisma ORM', desc: 'Couche d\'accès base de données type-safe et performante' },
  ];

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Architecture Robuste &amp; Scalable</Text>
        <Text style={styles.headerSubtitle}>Une infrastructure moderne conçue pour la performance et la sécurité</Text>
      </View>
      <View style={styles.headerAccentBar} />

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.sectionSubtitle}>
          L&apos;architecture de MAELLIS repose sur une pile technologique moderne et éprouvée,
          garantissant performance, sécurité et évolutivité pour répondre aux besoins des aéroports de toutes tailles.
        </Text>

        <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginBottom: 10 }}>
          Stack technique :
        </Text>

        {techStack.map((t, i) => (
          <View key={i} style={styles.techRow}>
            <Text style={styles.techName}>{t.name}</Text>
            <Text style={styles.techDesc}>{t.desc}</Text>
          </View>
        ))}

        <View style={styles.divider} />

        {/* Security */}
        <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginBottom: 10 }}>
          Sécurité &amp; fiabilité :
        </Text>
        <View style={styles.securityRow}>
          <View style={styles.securityBadge}>
            <Text style={styles.securityBadgeText}>🔐 JWT Auth</Text>
          </View>
          <View style={styles.securityBadge}>
            <Text style={styles.securityBadgeText}>⚡ Rate Limiting</Text>
          </View>
          <View style={styles.securityBadge}>
            <Text style={styles.securityBadgeText}>🔒 HTTPS / TLS</Text>
          </View>
          <View style={styles.securityBadge}>
            <Text style={styles.securityBadgeText}>🛡️ CORS</Text>
          </View>
          <View style={styles.securityBadge}>
            <Text style={styles.securityBadgeText}>📋 Audit Logs</Text>
          </View>
        </View>

        <View style={styles.spacer} />

        {/* Architecture diagram description */}
        <View style={{ backgroundColor: colors.gray50, borderRadius: 6, padding: '14 16', borderLeftWidth: 3, borderLeftColor: colors.primary }}>
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginBottom: 6 }}>
            Architecture en microservices :
          </Text>
          <Text style={{ fontSize: 9, color: colors.gray600, lineHeight: 14 }}>
            Le système est composé d&apos;un service bot (Bun/TypeScript sur port 3005) pour le traitement WhatsApp,
            d&apos;un dashboard Next.js pour l&apos;administration, d&apos;un serveur PostgreSQL pour les données persistantes
            et d&apos;un cache Redis pour les requêtes fréquentes. Le tout est conteneurisé avec Docker et orchestré
            via Docker Compose pour un déploiement simplifié.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>MAELLIS</Text>
        <Text style={styles.footerText}>Brochure Commerciale 2025</Text>
        <Text style={styles.footerText}>Page 4 / 7</Text>
      </View>
    </Page>
  );
}

// ====== PAGE 5: AVANTAGES CONCURRENTIELS ======
function CompetitivePage() {
  const comparisonData = [
    { feature: 'Intégration WhatsApp', maellis: true, competitor: false },
    { feature: 'IA Conversationnelle', maellis: true, competitor: false },
    { feature: '4 langues (FR/EN/WO/AR)', maellis: true, competitor: false },
    { feature: 'Paiement mobile local', maellis: true, competitor: false },
    { feature: 'Suivi bagages QR', maellis: true, competitor: false },
    { feature: 'Réservation salon VIP', maellis: true, competitor: false },
    { feature: 'Booking transport', maellis: true, competitor: false },
    { feature: 'Données vol temps réel', maellis: true, competitor: true },
    { feature: 'Dashboard admin', maellis: true, competitor: true },
    { feature: 'Déploiement Docker', maellis: true, competitor: false },
  ];

  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pourquoi Choisir MAELLIS ?</Text>
        <Text style={styles.headerSubtitle}>Des avantages compétitifs uniques sur le marché africain</Text>
      </View>
      <View style={styles.headerAccentBar} />

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.sectionSubtitle}>
          MAELLIS se démarque des solutions existantes par son approche pensée spécifiquement
          pour le marché africain, son intégration WhatsApp native et son intelligence artificielle avancée.
        </Text>

        {/* Languages */}
        <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginBottom: 8 }}>
          Support multilingue natif :
        </Text>
        <View style={styles.langRow}>
          <View style={styles.langBadge}>
            <Text style={styles.langBadgeText}>🇫🇷 Français</Text>
          </View>
          <View style={styles.langBadge}>
            <Text style={styles.langBadgeText}>🇬🇧 English</Text>
          </View>
          <View style={styles.langBadge}>
            <Text style={styles.langBadgeText}>🇸🇳 Wolof</Text>
          </View>
          <View style={styles.langBadge}>
            <Text style={styles.langBadgeText}>🇸🇦 العربية</Text>
          </View>
        </View>

        {/* Comparison Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={{ ...styles.tableHeaderCell, width: '40%' }}>Fonctionnalité</Text>
            <Text style={{ ...styles.tableHeaderCell, width: '30%', textAlign: 'center' }}>MAELLIS</Text>
            <Text style={{ ...styles.tableHeaderCell, width: '30%', textAlign: 'center' }}>Concurrents</Text>
          </View>
          {comparisonData.map((row, i) => (
            <View key={i} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
              <Text style={{ ...styles.tableCellBold, width: '40%' }}>{row.feature}</Text>
              <Text style={{ ...styles.tableCellGreen, width: '30%', textAlign: 'center' }}>
                {row.maellis ? '✓ Oui' : '✗ Non'}
              </Text>
              <Text style={{ ...styles.tableCellRed, width: '30%', textAlign: 'center' }}>
                {row.competitor ? '✓ Oui' : '✗ Non'}
              </Text>
            </View>
          ))}
        </View>

        {/* ROI Metrics */}
        <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginTop: 20, marginBottom: 8 }}>
          Retour sur investissement prouvé :
        </Text>
        <View style={styles.roiRow}>
          <View style={styles.roiCard}>
            <Text style={styles.roiValue}>-40%</Text>
            <Text style={styles.roiLabel}>Appels au centre d&apos;appel</Text>
          </View>
          <View style={styles.roiCard}>
            <Text style={styles.roiValue}>-60%</Text>
            <Text style={styles.roiLabel}>Temps de résolution bagages</Text>
          </View>
          <View style={styles.roiCard}>
            <Text style={styles.roiValue}>+35%</Text>
            <Text style={styles.roiLabel}>Satisfaction passagers</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>MAELLIS</Text>
        <Text style={styles.footerText}>Brochure Commerciale 2025</Text>
        <Text style={styles.footerText}>Page 5 / 7</Text>
      </View>
    </Page>
  );
}

// ====== PAGE 6: TARIFICATION ======
function PricingPage() {
  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Offres &amp; Tarification</Text>
        <Text style={styles.headerSubtitle}>Des formules adaptées à la taille et aux besoins de chaque aéroport</Text>
      </View>
      <View style={styles.headerAccentBar} />

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.sectionSubtitle}>
          Que vous soyez un aéroport régional ou international, MAELLIS propose une formule
          adaptée à vos besoins. Toutes les offres incluent le support technique et les mises à jour.
        </Text>

        <View style={styles.pricingGrid}>
          {/* Basic */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTierName}>BASIC</Text>
              <Text style={styles.pricingPrice}>990€</Text>
              <Text style={styles.pricingPriceNote}>/ mois</Text>
            </View>
            <View style={styles.pricingBody}>
              {[
                'Jusqu\'à 5 000 conversations / mois',
                'Recherche et suivi de vols',
                '1 langue (FR ou EN)',
                'Dashboard admin basique',
                'Support email',
                'SLA 99%',
              ].map((f, i) => (
                <View key={i} style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureIcon}>✓</Text>
                  <Text style={styles.pricingFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Pro */}
          <View style={styles.pricingCardFeatured}>
            <View style={styles.pricingHeaderFeatured}>
              <View style={styles.pricingBadgePopular}>
                <Text style={styles.pricingBadgePopularText}>⭐ POPULAIRE</Text>
              </View>
              <Text style={styles.pricingTierNameFeatured}>PRO</Text>
              <Text style={styles.pricingPriceFeatured}>2 490€</Text>
              <Text style={styles.pricingPriceNoteFeatured}>/ mois</Text>
            </View>
            <View style={styles.pricingBody}>
              {[
                'Jusqu\'à 20 000 conversations / mois',
                'Toutes les fonctionnalités (vols, bagages, transport)',
                '4 langues (FR, EN, Wolof, Arabe)',
                'Paiement mobile (Orange Money, Wave)',
                'Dashboard admin avancé',
                'Support prioritaire 24/7',
                'SLA 99.9%',
                'Formation incluse',
              ].map((f, i) => (
                <View key={i} style={styles.pricingFeatureRow}>
                  <Text style={{ ...styles.pricingFeatureIcon, color: colors.primary }}>✓</Text>
                  <Text style={styles.pricingFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Enterprise */}
          <View style={styles.pricingCard}>
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingTierName}>ENTERPRISE</Text>
              <Text style={styles.pricingPrice}>Sur devis</Text>
              <Text style={styles.pricingPriceNote}>personnalisé</Text>
            </View>
            <View style={styles.pricingBody}>
              {[
                'Conversations illimitées',
                'Toutes les fonctionnalités PRO',
                'Langues personnalisées',
                'Intégrations API sur mesure',
                'Multi-aéroports',
                'Account manager dédié',
                'SLA 99.99%',
                'Formation & accompagnement',
                'Migration de données',
              ].map((f, i) => (
                <View key={i} style={styles.pricingFeatureRow}>
                  <Text style={styles.pricingFeatureIcon}>✓</Text>
                  <Text style={styles.pricingFeatureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{ marginTop: 20, backgroundColor: colors.gray50, borderRadius: 6, padding: '12 16', borderLeftWidth: 3, borderLeftColor: colors.secondary }}>
          <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginBottom: 4 }}>
            💡 Tous les prix sont en HT. Réduction de 15% pour un engagement annuel.
          </Text>
          <Text style={{ fontSize: 9, color: colors.gray500 }}>
            Installation et configuration incluses dans toutes les offres. Frais d&apos;installation unique : 1 500€ (Basic) / 3 000€ (Pro) / Négociable (Enterprise).
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>MAELLIS</Text>
        <Text style={styles.footerText}>Brochure Commerciale 2025</Text>
        <Text style={styles.footerText}>Page 6 / 7</Text>
      </View>
    </Page>
  );
}

// ====== PAGE 7: CONTACT ======
function ContactPage() {
  return (
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Démarrons Ensemble</Text>
        <Text style={styles.headerSubtitle}>Transformez votre aéroport avec MAELLIS — Contactez-nous dès aujourd'hui</Text>
      </View>
      <View style={styles.headerAccentBar} />

      {/* Body */}
      <View style={styles.body}>
        <Text style={styles.sectionSubtitle}>
          Vous êtes intéressé par MAELLIS pour votre aéroport ou agence ? Notre équipe est prête
          pour vous accompagner dans votre projet de transformation digitale.
        </Text>

        {/* Contact Card */}
        <View style={styles.contactCard}>
          <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginBottom: 16 }}>
            Nos coordonnées
          </Text>

          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>📧</Text>
            <View>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>contact@maellis.tech</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>📱</Text>
            <View>
              <Text style={styles.contactLabel}>Téléphone</Text>
              <Text style={styles.contactValue}>+221 78 123 45 67</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>🌐</Text>
            <View>
              <Text style={styles.contactLabel}>Site web</Text>
              <Text style={styles.contactValue}>www.maellis.tech</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>📍</Text>
            <View>
              <Text style={styles.contactLabel}>Adresse</Text>
              <Text style={styles.contactValue}>Dakar, Sénégal — Afrique de l&apos;Ouest</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <Text style={styles.contactIcon}>💼</Text>
            <View>
              <Text style={styles.contactLabel}>LinkedIn</Text>
              <Text style={styles.contactValue}>linkedin.com/company/maellis</Text>
            </View>
          </View>
        </View>

        {/* CTA */}
        <View style={styles.ctaButton}>
          <Text style={styles.ctaButtonText}>Planifiez une démo gratuite</Text>
        </View>
        <Text style={styles.ctaSubtext}>
          Réservez une démonstration personnalisée de 30 minutes avec un de nos experts
        </Text>

        <View style={styles.divider} />

        {/* Process steps */}
        <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', color: colors.gray800, marginBottom: 10 }}>
          Comment démarrer ?
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, padding: '12 10', backgroundColor: colors.emerald50, borderRadius: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginBottom: 4 }}>📞</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.primary, textAlign: 'center' }}>1. Contactez-nous</Text>
            <Text style={{ fontSize: 8, color: colors.gray500, textAlign: 'center', marginTop: 2 }}>Appel ou email initial</Text>
          </View>
          <View style={{ flex: 1, padding: '12 10', backgroundColor: colors.teal50, borderRadius: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginBottom: 4 }}>🎯</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.secondaryDark, textAlign: 'center' }}>2. Démo personnalisée</Text>
            <Text style={{ fontSize: 8, color: colors.gray500, textAlign: 'center', marginTop: 2 }}>Présentation adaptée</Text>
          </View>
          <View style={{ flex: 1, padding: '12 10', backgroundColor: colors.emerald50, borderRadius: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginBottom: 4 }}>⚙️</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.primary, textAlign: 'center' }}>3. Intégration</Text>
            <Text style={{ fontSize: 8, color: colors.gray500, textAlign: 'center', marginTop: 2 }}>Déploiement en 2 semaines</Text>
          </View>
          <View style={{ flex: 1, padding: '12 10', backgroundColor: colors.teal50, borderRadius: 6, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginBottom: 4 }}>🚀</Text>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: colors.secondaryDark, textAlign: 'center' }}>4. Lancement</Text>
            <Text style={{ fontSize: 8, color: colors.gray500, textAlign: 'center', marginTop: 2 }}>Support continu 24/7</Text>
          </View>
        </View>

        <View style={{ marginTop: 24, textAlign: 'center' }}>
          <Text style={{ fontSize: 18, fontFamily: 'Helvetica-Bold', color: colors.primary, letterSpacing: 6 }}>MAELLIS</Text>
          <Text style={{ fontSize: 10, color: colors.gray400, marginTop: 4 }}>
            L&apos;avenir des aéroports africains commence ici.
          </Text>
          <Text style={{ fontSize: 8, color: colors.gray400, marginTop: 8 }}>
            © 2025 MAELLIS Technologies. Tous droits réservés.
          </Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>MAELLIS</Text>
        <Text style={styles.footerText}>Brochure Commerciale 2025</Text>
        <Text style={styles.footerText}>Page 7 / 7</Text>
      </View>
    </Page>
  );
}

// ====== MAIN DOCUMENT ======
const MaellisBrochure = () => (
  <Document
    title="MAELLIS — Assistant Aéroport Intelligent"
    author="MAELLIS Technologies"
    subject="Brochure commerciale MAELLIS"
    creator="MAELLIS Brochure Generator"
    keywords="aéroport, whatsapp, IA, afrique, assistant, MAELLIS"
  >
    <CoverPage />
    <ProblemPage />
    <SolutionPage />
    <ArchitecturePage />
    <CompetitivePage />
    <PricingPage />
    <ContactPage />
  </Document>
);

// ====== GENERATE PDF ======
async function generateBrochure() {
  const outputPath = join(dirname(new URL(import.meta.url).pathname), '..', 'public', 'brochure-maellis-aeroport.pdf');
  const resolvedPath = outputPath;

  console.log('📋 MAELLIS Brochure Generator');
  console.log('==============================');
  console.log(`📝 Generating PDF brochure...`);

  try {
    // Ensure output directory exists
    mkdirSync(dirname(resolvedPath), { recursive: true });

    // Generate and write PDF
    await renderToFile(<MaellisBrochure />, resolvedPath);

    const fs = await import('fs/promises');
    const stat = await fs.stat(resolvedPath);
    const sizeKB = Math.round(stat.size / 1024);

    console.log(`✅ PDF generated successfully!`);
    console.log(`   Path: ${resolvedPath}`);
    console.log(`   Size: ${sizeKB} KB`);
    console.log(`   Pages: 7`);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    process.exit(1);
  }
}

generateBrochure();
