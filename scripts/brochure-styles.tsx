import { StyleSheet } from '@react-pdf/renderer';

export const colors = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#10B981',
  secondary: '#0D9488',
  secondaryDark: '#0F766E',
  secondaryLight: '#14B8A6',
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  amber500: '#F59E0B',
  amber100: '#FEF3C7',
  red500: '#EF4444',
  red100: '#FEE2E2',
  purple500: '#8B5CF6',
  orange500: '#F97316',
  orange100: '#FFEDD5',
  sky500: '#0EA5E9',
  emerald50: '#ECFDF5',
  emerald100: '#D1FAE5',
  teal50: '#F0FDFA',
  teal100: '#CCFBF1',
};

export const styles = StyleSheet.create({
  // ====== Page base ======
  page: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: colors.gray800,
    padding: 0,
  },

  // ====== Cover page ======
  coverPage: {
    fontFamily: 'Helvetica',
    fontSize: 11,
    color: colors.white,
    padding: 0,
  },
  coverGradientTop: {
    height: '100%',
    backgroundColor: colors.primary,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  coverGradientOverlay: {
    height: '55%',
    backgroundColor: colors.secondary,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderRadius: 0,
  },
  coverContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  coverLogo: {
    fontSize: 72,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
    marginBottom: 8,
    letterSpacing: 12,
  },
  coverSubtitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  coverTagline: {
    fontSize: 14,
    color: colors.emerald100,
    textAlign: 'center',
    marginBottom: 60,
    lineHeight: 20,
  },
  coverBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: colors.primaryLight,
  },
  coverDivider: {
    width: 120,
    height: 3,
    backgroundColor: colors.emerald100,
    marginBottom: 20,
    borderRadius: 2,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 9,
    color: colors.gray300,
  },
  coverYear: {
    fontSize: 11,
    color: colors.gray300,
    marginTop: 6,
  },

  // ====== Standard page layout ======
  header: {
    backgroundColor: colors.primary,
    padding: '24 40 20 40',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.emerald100,
    marginTop: 4,
  },
  headerAccentBar: {
    height: 4,
    backgroundColor: colors.secondary,
  },
  body: {
    padding: '30 40 30 40',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12 40',
    backgroundColor: colors.gray50,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  footerText: {
    fontSize: 8,
    color: colors.gray400,
  },
  footerBrand: {
    fontSize: 8,
    color: colors.primary,
    fontFamily: 'Helvetica-Bold',
  },

  // ====== Section titles ======
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray900,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.gray500,
    marginBottom: 20,
    lineHeight: 16,
  },

  // ====== Bullet points ======
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingLeft: 4,
  },
  bulletIcon: {
    fontSize: 12,
    marginRight: 10,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 11,
    color: colors.gray700,
    lineHeight: 16,
    flex: 1,
  },
  bulletTextBold: {
    fontFamily: 'Helvetica-Bold',
    color: colors.gray800,
  },

  // ====== Stat card ======
  statCard: {
    backgroundColor: colors.emerald50,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    padding: '16 20',
    borderRadius: 4,
    marginTop: 16,
  },
  statValue: {
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.gray600,
  },

  // ====== Feature blocks ======
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  featureCard: {
    width: '47%',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 6,
    padding: '14 16',
  },
  featureIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  featureTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray800,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 9,
    color: colors.gray500,
    lineHeight: 13,
  },

  // ====== Tech stack ======
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: '8 12',
    backgroundColor: colors.gray50,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  techName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray800,
    width: '30%',
  },
  techDesc: {
    fontSize: 10,
    color: colors.gray500,
    flex: 1,
  },

  // ====== Security badges ======
  securityRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  securityBadge: {
    backgroundColor: colors.emerald50,
    borderWidth: 1,
    borderColor: colors.emerald100,
    borderRadius: 4,
    padding: '8 14',
    alignItems: 'center',
  },
  securityBadgeText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.primaryDark,
  },

  // ====== Comparison table ======
  table: {
    marginTop: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: 4,
    padding: '10 12',
  },
  tableHeaderCell: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '10 12',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    alignItems: 'center',
  },
  tableRowAlt: {
    flexDirection: 'row',
    padding: '10 12',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.gray50,
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 10,
    color: colors.gray700,
  },
  tableCellBold: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray800,
  },
  tableCellGreen: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
  tableCellRed: {
    fontSize: 10,
    color: colors.red500,
  },

  // ====== ROI metrics ======
  roiRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  roiCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 6,
    padding: '14 16',
    alignItems: 'center',
  },
  roiValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: colors.primary,
  },
  roiLabel: {
    fontSize: 9,
    color: colors.gray500,
    marginTop: 4,
    textAlign: 'center',
  },

  // ====== Language badges ======
  langRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  langBadge: {
    backgroundColor: colors.teal50,
    borderWidth: 1,
    borderColor: colors.teal100,
    borderRadius: 12,
    padding: '6 14',
    alignItems: 'center',
  },
  langBadgeText: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: colors.secondaryDark,
  },

  // ====== Pricing ======
  pricingGrid: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 16,
  },
  pricingCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  pricingCardFeatured: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  pricingHeader: {
    backgroundColor: colors.gray50,
    padding: '14 16',
    alignItems: 'center',
  },
  pricingHeaderFeatured: {
    backgroundColor: colors.primary,
    padding: '14 16',
    alignItems: 'center',
  },
  pricingTierName: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray700,
    marginBottom: 2,
  },
  pricingTierNameFeatured: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
    marginBottom: 2,
  },
  pricingPrice: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray900,
  },
  pricingPriceFeatured: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
  },
  pricingPriceNote: {
    fontSize: 8,
    color: colors.gray400,
  },
  pricingPriceNoteFeatured: {
    fontSize: 8,
    color: colors.emerald100,
  },
  pricingBody: {
    padding: '14 16',
  },
  pricingFeatureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  pricingFeatureIcon: {
    fontSize: 10,
    marginRight: 6,
    marginTop: 1,
  },
  pricingFeatureText: {
    fontSize: 9,
    color: colors.gray600,
    lineHeight: 13,
    flex: 1,
  },
  pricingBadgePopular: {
    backgroundColor: colors.amber100,
    padding: '3 10',
    borderRadius: 10,
    marginBottom: 6,
  },
  pricingBadgePopularText: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: colors.amber500,
  },

  // ====== Contact page ======
  contactCard: {
    backgroundColor: colors.emerald50,
    borderRadius: 8,
    padding: '20 24',
    borderWidth: 1,
    borderColor: colors.emerald100,
    marginTop: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  contactLabel: {
    fontSize: 9,
    color: colors.gray500,
    marginBottom: 1,
  },
  contactValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: colors.gray800,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    padding: '14 30',
    marginTop: 20,
    alignItems: 'center',
  },
  ctaButtonText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: colors.white,
  },
  ctaSubtext: {
    fontSize: 9,
    color: colors.gray400,
    marginTop: 8,
    textAlign: 'center',
  },

  // ====== Utility ======
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
  textSmall: {
    fontSize: 9,
  },
  textMuted: {
    color: colors.gray500,
  },
  marginTop: {
    marginTop: 12,
  },
  marginBottom: {
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 16,
  },
  spacer: {
    height: 12,
  },
  flexRow: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  gap8: {
    gap: 8,
  },
  gap16: {
    gap: 16,
  },
});
