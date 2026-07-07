export enum AgentType {
  INDIVIDUAL = 'individual',
  COLLECTIVE = 'collective',
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
  website: string;
}

export interface Address {
  text: string;
  lat: number;
  lng: number;
  mapUrl?: string;
  zipCode?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  city?: string;
  state?: string;
}

export interface MediaGallery {
  banner?: string;
  profile?: string;
  gallery: string[];
}

export interface UserProfile {
  uid: string;
  fullName: string;
  socialName?: string;
  cpf?: string;
  rgOrCnpj?: string;
  publicPhone?: string;
  privatePhone?: string;
  privateEmail?: string;
  publicEmail?: string;
  birthDate?: string;
  isSenior?: boolean;
  gender?: string;
  sexualOrientation?: string;
  itinerantAgent?: boolean;
  raceColor?: string;
  education?: string;
  disability?: boolean;
  traditionalCommunities?: string;
  externalLink?: string;
  miniBio?: string;
  areas?: string[];
  areas_input?: string;
  createdAt: any;
  updatedAt: any;
}

export interface CulturalAgent {
  id: string;
  name: string;
  socialName?: string;
  cpf?: string;
  type: AgentType;
  description: string;
  shortDescription?: string;
  areasOfActivity: string[];
  tags: string[];
  address: Address;
  contactInfo: ContactInfo;
  socialLinks: SocialLink[];
  images: MediaGallery;
  videos: string[];
  certified?: boolean;
  // Extended fields for individual agents as seen in PDF
  birthDate?: string;
  isSenior?: boolean;
  gender?: string;
  sexualOrientation?: string;
  itinerantAgent?: boolean;
  raceColor?: string;
  education?: string;
  disability?: boolean;
  traditionalCommunities?: string;
  externalLink?: string;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

export interface BannerInfo {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  image: string;
  bgColor: string;
  textColor: string;
  zoom?: number;
  positionX?: number;
  positionY?: number;
}

export interface FooterConfig {
  vision: string;
  instagram: string;
  facebook: string;
  youtube: string;
  address: string;
  phone: string;
  addressText: string;
  email: string;
  copyrightText?: string;
  footerLogoUrl?: string;
  footerTitle?: string;
  footerSubtitle?: string;
  systemTitle?: string;
  systemSubtitle?: string;
}

export interface CategoryBanner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  icon?: string;
  zoom?: number;
  positionX?: number;
  positionY?: number;
}

export interface StatsConfig {
  opportunitiesCount: number;
  newOpportunitiesCount: number;
  collectiveAgentsCount: number;
  certifiedCollectiveAgentsCount: number;
  individualAgentsCount: number;
  certifiedIndividualAgentsCount: number;
  spacesCount: number;
  certifiedSpacesCount: number;
  projectsCount: number;
  certifiedProjectsCount: number;
  eventsCount: number;
  certifiedEventsCount: number;
}

export interface ThemeColors {
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  bodyBg: string;
  headerBg: string;
  footerBg: string;
  textPrimary: string;
  textSecondary: string;
  navItemBg: string;
  navItemActive: string;
  oportunidades: string;
  eventos: string;
  espacos: string;
  agentes: string;
  projetos: string;
}

export interface ReportsConfig {
  title?: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  exportLabel?: string;
  filterLabel?: string;
  growthTitle?: string;
  growthSubtitle?: string;
  profilesTitle?: string;
  profilesSubtitle?: string;
  volumesTitle?: string;
  volumesSubtitle?: string;
  goalTitle?: string;
  goalSubtitle?: string;
  goalStatus?: string;
  goalValue?: number;
  mappingTitle?: string;
  mappingSubtitle?: string;
  mappingInfoTitle?: string;
  mappingInfoText?: string;
  footerTitle?: string;
  footerSubtitle?: string;
  footerButtonLabel?: string;
}

export interface SiteConfig {
  siteName?: string;
  logoUrl: string;
  logoScale?: number;
  heroBannerImage?: string;
  heroBannerUrl?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroZoom?: number;
  heroPositionX?: number;
  heroPositionY?: number;
  featuredTitle?: string;
  featuredDescription?: string;
  featuredBadgeUrl?: string;
  banners: BannerInfo[];
  categoryBanners?: CategoryBanner[];
  stats?: StatsConfig;
  footer: FooterConfig;
  themeColors?: ThemeColors;
  reportsConfig?: ReportsConfig;
}

export interface AppConfig {
  logoUrl?: string;
  adminEmails?: string[];
  siteConfig?: SiteConfig;
  helpConfig?: HelpConfig;
}

export interface HelpTopicConfig {
  title: string;
  content: string;
  tags?: string[];
}

export interface HelpCategoryConfig {
  title: string;
  topics: HelpTopicConfig[];
}

export interface HelpConfig {
  faqCategories?: HelpCategoryConfig[];
  privacyPolicy?: string;
  termsOfUse?: string;
  imageAuthorization?: string;
}

export interface CulturalSpace {
  id: string;
  name: string;
  type: string;
  description: string;
  shortDescription?: string;
  accessibility: string;
  areasOfActivity: string[];
  address: Address;
  ownerId: string;
  official?: boolean;
  createdAt: any;
  updatedAt: any;
  images: MediaGallery;
}

export interface CulturalEvent {
  id: string;
  name: string;
  description: string;
  date: any;
  location: string;
  classification: string;
  entry: string;
  languages: string[];
  ownerId: string;
  official?: boolean;
  createdAt: any;
  updatedAt: any;
  images: MediaGallery;
  spaceId?: string;
}

export interface CulturalOpportunity {
  id: string;
  name: string;
  type: string;
  startDate?: any;
  deadline: any;
  status: 'open' | 'closed' | 'future';
  description: string;
  presentation?: string;
  areas: string[];
  tags: string[];
  ownerId: string;
  imageUrl?: string;
  bannerUrl?: string;
  official?: boolean;
  createdAt: any;
  updatedAt: any;
  link?: string;
  registrationOptions?: string[];
  files?: { name: string; url: string }[];
  modelFiles?: Record<string, string>;
  agentLabel?: string;
  timelinePhases?: { name: string; startDate?: string; endDate?: string }[];
}

export interface CulturalProject {
  id: string;
  name: string;
  type: string;
  description: string;
  ownerId: string;
  official?: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface RegistrationEvaluation {
  reviewerId: string;
  reviewerName: string;
  score: number;
  totalPossible: number;
  comments: string;
  criteriaScores: {
    label: string;
    score: number;
    maxScore: number;
    description?: string;
  }[];
}

export interface RegistrationPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'completed' | 'not_selected';
  resultDescription?: string;
  evaluations?: RegistrationEvaluation[];
}

export interface OpportunityRegistration {
  id: string;
  opportunityId: string;
  userId: string;
  agentId?: string;
  agentName?: string;
  opportunityTitle?: string;
  opportunityImage?: string;
  agentImage?: string;
  proponentType: string;
  category?: string;
  range?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected';
  registrationNumber: string;
  pdfUrl?: string;
  data: any;
  phases?: RegistrationPhase[];
  consolidatedScore?: number;
  maxPossibleScore?: number;
  createdAt: any;
  updatedAt: any;
  adminAuthorized?: boolean;
}
