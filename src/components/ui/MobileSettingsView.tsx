import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  Save, 
  DollarSign, 
  Settings, 
  CheckCircle, 
  User, 
  ChevronDown, 
  Check, 
  Lock, 
  Share2, 
  Heart, 
  MapPin, 
  Car, 
  Briefcase, 
  Shield,
  Sparkles
} from 'lucide-react';
import { Database } from '../../lib/database.types';
import Toast from './Toast';
import { useClientQuestionnaire } from '../../hooks/useClientQuestionnaire';
import { useClientDetails } from '../../hooks/useClientDetails';

type Client = Database['public']['Tables']['clients']['Row'];
type ClientPreferences = Database['public']['Tables']['client_preferences']['Row'];

interface MobileSettingsViewProps {
  client: Client;
  preferences: ClientPreferences | null;
  onSave: (preferencesData: any) => Promise<{ error: string | null }>;
}

type ContentDetail = {
  enabled: boolean;
  priceMin: number;
  priceMax: number;
};

// Accordion Section Component
interface AccordionSectionProps {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBgColor: string;
  isOpen: boolean;
  onToggle: () => void;
  completedCount?: number;
  totalCount?: number;
  children: React.ReactNode;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  subtitle,
  icon,
  iconBgColor,
  isOpen,
  onToggle,
  completedCount,
  totalCount,
  children
}) => {
  const hasProgress = completedCount !== undefined && totalCount !== undefined;
  const isComplete = hasProgress && completedCount === totalCount && totalCount > 0;
  
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
      {/* Header - Always visible */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center flex-1 min-w-0">
          <div className={`w-10 h-10 ${iconBgColor} rounded-xl flex items-center justify-center mr-3 flex-shrink-0`}>
            {icon}
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 truncate">{title}</h3>
              {isComplete && (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0 ml-2">
          {hasProgress && !isComplete && (
            <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {completedCount}/{totalCount}
            </span>
          )}
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>
      
      {/* Content - Collapsible */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
};

const MobileSettingsView: React.FC<MobileSettingsViewProps> = ({ 
  client, 
  preferences, 
  onSave 
}) => {
  const [activeTab, setActiveTab] = useState<'customs' | 'details'>('customs');
  
  // Accordion open states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personalInfo: false,
    credentials: false,
    socialMedia: false,
    identity: false,
    physical: false,
    lifestyle: false,
    boundaries: false,
    personas: false,
    contentPricing: false
  });
  
  // Use the questionnaire hook
  const {
    questionnaire: existingQuestionnaire,
    personas: existingPersonas,
    contentDetails: existingContentDetails,
    saveQuestionnaire,
    savePersonas,
    saveAllContentDetails
  } = useClientQuestionnaire(client?.id);

  const {
    personalInfo: existingPersonalInfo,
    platformCredentials: existingPlatformCredentials,
    socialMediaAccounts: existingSocialMediaAccounts,
    savePersonalInfo,
    savePlatformCredentials,
    saveSocialMediaAccounts
  } = useClientDetails(client?.id);
  
  const [formData, setFormData] = useState({
    minimumPricing: 0,
    videoCall: false,
    audioCall: false,
    dickRates: false,
    fanSigns: false,
    usingFansName: false,
    sayingSpecificThings: false,
    roleplaying: false,
    usingToysProps: false,
    specificOutfits: false,
    fullNudityCensored: false,
    fullNudityUncensored: false,
    masturbation: false,
    analContent: false,
    feetContent: false,
  });
  
  const [questionnaireData, setQuestionnaireData] = useState<Record<string, string>>({
    publicName: '',
    publicNicknames: '',
    publicBirthday: '',
    gender: '',
    nativeLanguage: '',
    otherLanguages: '',
    sexualOrientation: '',
    ethnicity: '',
    height: '',
    weight: '',
    shoeSize: '',
    braSize: '',
    zodiacSign: '',
    favoriteColors: '',
    birthPlace: '',
    currentLocation: '',
    hobbies: '',
    college: '',
    currentCar: '',
    dreamCar: '',
    pets: '',
    favoritePlaceTraveled: '',
    dreamDestination: '',
    relationshipStatus: '',
    dreamDate: '',
    hasChildren: '',
    otherCareer: '',
    knownFrom: '',
    additionalInfo: '',
    hardNos: '',
    weekdayRoutine: '',
    weekendRoutine: '',
  });

  // Personal Information
  const [personalInfo, setPersonalInfo] = useState({
    legalName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
  });

  // Platform Credentials
  const [platformCredentials, setPlatformCredentials] = useState<Array<{
    id: string;
    platform: string;
    email: string;
    password: string;
  }>>([]);

  // Social Media Accounts
  const [socialMediaAccounts, setSocialMediaAccounts] = useState<Array<{
    id: string;
    platform: string;
    username: string;
  }>>([]);

  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showPlatformDropdown, setShowPlatformDropdown] = useState(false);
  const [showSocialDropdown, setShowSocialDropdown] = useState(false);

  const [contentDetails, setContentDetails] = useState<Record<string, ContentDetail>>({
    buttContent: { enabled: false, priceMin: 0, priceMax: 0 },
    breastContent: { enabled: false, priceMin: 0, priceMax: 0 },
    visibleNipples: { enabled: false, priceMin: 0, priceMax: 0 },
    girlGirlContent: { enabled: false, priceMin: 0, priceMax: 0 },
    boyGirlContent: { enabled: false, priceMin: 0, priceMax: 0 },
    twerkVideos: { enabled: false, priceMin: 0, priceMax: 0 },
    fullNudityCensored: { enabled: false, priceMin: 0, priceMax: 0 },
    fullNudityUncensored: { enabled: false, priceMin: 0, priceMax: 0 },
    masturbation: { enabled: false, priceMin: 0, priceMax: 0 },
    fetishKink: { enabled: false, priceMin: 0, priceMax: 0 },
    feet: { enabled: false, priceMin: 0, priceMax: 0 },
    dickRates: { enabled: false, priceMin: 0, priceMax: 0 },
    customRequests: { enabled: false, priceMin: 0, priceMax: 0 },
  });
  
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Toggle accordion section
  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Load preferences into form when available
  useEffect(() => {
    if (preferences) {
      setFormData({
        minimumPricing: preferences.minimum_pricing || 0,
        videoCall: preferences.video_call || false,
        audioCall: preferences.audio_call || false,
        dickRates: preferences.dick_rates || false,
        fanSigns: preferences.fan_signs || false,
        usingFansName: preferences.using_fans_name || false,
        sayingSpecificThings: preferences.saying_specific_things || false,
        roleplaying: preferences.roleplaying || false,
        usingToysProps: preferences.using_toys_props || false,
        specificOutfits: preferences.specific_outfits || false,
        fullNudityCensored: preferences.full_nudity_censored || false,
        fullNudityUncensored: preferences.full_nudity_uncensored || false,
        masturbation: preferences.masturbation || false,
        analContent: preferences.anal_content || false,
        feetContent: preferences.feet_content || false,
      });
    }
  }, [preferences]);

  // Load existing questionnaire data
  useEffect(() => {
    if (existingQuestionnaire) {
      setQuestionnaireData({
        publicName: existingQuestionnaire.public_name || '',
        publicNicknames: existingQuestionnaire.public_nicknames || '',
        publicBirthday: existingQuestionnaire.public_birthday || '',
        gender: existingQuestionnaire.gender || '',
        nativeLanguage: existingQuestionnaire.native_language || '',
        otherLanguages: existingQuestionnaire.other_languages || '',
        sexualOrientation: existingQuestionnaire.sexual_orientation || '',
        ethnicity: existingQuestionnaire.ethnicity || '',
        height: existingQuestionnaire.height || '',
        weight: existingQuestionnaire.weight || '',
        shoeSize: existingQuestionnaire.shoe_size || '',
        braSize: existingQuestionnaire.bra_size || '',
        zodiacSign: existingQuestionnaire.zodiac_sign || '',
        favoriteColors: existingQuestionnaire.favorite_colors || '',
        birthPlace: existingQuestionnaire.birth_place || '',
        currentLocation: existingQuestionnaire.current_location || '',
        hobbies: existingQuestionnaire.hobbies || '',
        college: existingQuestionnaire.college || '',
        currentCar: existingQuestionnaire.current_car || '',
        dreamCar: existingQuestionnaire.dream_car || '',
        pets: existingQuestionnaire.pets || '',
        favoritePlaceTraveled: existingQuestionnaire.favorite_place_traveled || '',
        dreamDestination: existingQuestionnaire.dream_destination || '',
        relationshipStatus: existingQuestionnaire.relationship_status || '',
        dreamDate: existingQuestionnaire.dream_date || '',
        hasChildren: existingQuestionnaire.has_children || '',
        otherCareer: existingQuestionnaire.other_career || '',
        knownFrom: existingQuestionnaire.known_from || '',
        additionalInfo: existingQuestionnaire.additional_info || '',
        hardNos: existingQuestionnaire.hard_nos || '',
        weekdayRoutine: existingQuestionnaire.weekday_routine || '',
        weekendRoutine: existingQuestionnaire.weekend_routine || '',
      });
    }
  }, [existingQuestionnaire]);

  // Load existing personas
  useEffect(() => {
    if (existingPersonas && existingPersonas.length > 0) {
      setSelectedPersonas(existingPersonas);
    }
  }, [existingPersonas]);

  // Load existing content details
  useEffect(() => {
    if (existingContentDetails && existingContentDetails.length > 0) {
      const detailsObj: Record<string, ContentDetail> = {
        buttContent: { enabled: false, priceMin: 0, priceMax: 0 },
        breastContent: { enabled: false, priceMin: 0, priceMax: 0 },
        visibleNipples: { enabled: false, priceMin: 0, priceMax: 0 },
        girlGirlContent: { enabled: false, priceMin: 0, priceMax: 0 },
        boyGirlContent: { enabled: false, priceMin: 0, priceMax: 0 },
        twerkVideos: { enabled: false, priceMin: 0, priceMax: 0 },
        fullNudityCensored: { enabled: false, priceMin: 0, priceMax: 0 },
        fullNudityUncensored: { enabled: false, priceMin: 0, priceMax: 0 },
        masturbation: { enabled: false, priceMin: 0, priceMax: 0 },
        fetishKink: { enabled: false, priceMin: 0, priceMax: 0 },
        feet: { enabled: false, priceMin: 0, priceMax: 0 },
        dickRates: { enabled: false, priceMin: 0, priceMax: 0 },
        customRequests: { enabled: false, priceMin: 0, priceMax: 0 },
      };
      
      existingContentDetails.forEach((detail: any) => {
        if (detailsObj[detail.content_type]) {
          detailsObj[detail.content_type] = {
            enabled: detail.enabled,
            priceMin: detail.price_min,
            priceMax: detail.price_max
          };
        }
      });
      
      setContentDetails(detailsObj);
    }
  }, [existingContentDetails]);

  // Load existing personal info
  useEffect(() => {
    if (existingPersonalInfo) {
      setPersonalInfo({
        legalName: existingPersonalInfo.legal_name || '',
        email: existingPersonalInfo.email || '',
        phone: existingPersonalInfo.phone || '',
        dateOfBirth: existingPersonalInfo.date_of_birth || '',
        address: existingPersonalInfo.address || '',
      });
    }
  }, [existingPersonalInfo]);

  // Load existing platform credentials
  useEffect(() => {
    if (existingPlatformCredentials && existingPlatformCredentials.length > 0) {
      setPlatformCredentials(existingPlatformCredentials);
    }
  }, [existingPlatformCredentials]);

  // Load existing social media accounts
  useEffect(() => {
    if (existingSocialMediaAccounts && existingSocialMediaAccounts.length > 0) {
      setSocialMediaAccounts(existingSocialMediaAccounts);
    }
  }, [existingSocialMediaAccounts]);

  const handleSave = async () => {
    setLoading(true);
    
    try {
      if (activeTab === 'customs') {
        const { error } = await onSave(formData);
        if (error) throw new Error(error);
      } else if (activeTab === 'details') {
        const personalInfoError = await savePersonalInfo(personalInfo);
        if (personalInfoError.error) throw new Error(personalInfoError.error);
        
        const credentialsError = await savePlatformCredentials(platformCredentials);
        if (credentialsError.error) throw new Error(credentialsError.error);
        
        const socialError = await saveSocialMediaAccounts(socialMediaAccounts);
        if (socialError.error) throw new Error(socialError.error);
        
        const questionnaireError = await saveQuestionnaire(questionnaireData);
        if (questionnaireError.error) throw new Error(questionnaireError.error);
        
        const personasError = await savePersonas(selectedPersonas);
        if (personasError.error) throw new Error(personasError.error);
        
        const contentError = await saveAllContentDetails(contentDetails);
        if (contentError.error) throw new Error(contentError.error);
      }
      
      setToastMessage('Saved successfully! ✨');
      setToastType('success');
      setShowToast(true);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setToastMessage(err.message || 'Failed to save');
      setToastType('error');
      setShowToast(true);
    }
    
    setLoading(false);
  };

  const contentTypes = [
    { key: 'videoCall', label: 'Video Call' },
    { key: 'audioCall', label: 'Audio Call' },
    { key: 'dickRates', label: 'Dick Rates' },
    { key: 'fanSigns', label: 'Fan Signs' },
    { key: 'usingFansName', label: "Using Fan's Name" },
    { key: 'sayingSpecificThings', label: 'Saying Specific Things' },
    { key: 'roleplaying', label: 'Roleplaying' },
    { key: 'usingToysProps', label: 'Using Toys/Props' },
    { key: 'specificOutfits', label: 'Specific Outfits' },
    { key: 'fullNudityCensored', label: 'Full Nudity (Censored)' },
    { key: 'fullNudityUncensored', label: 'Full Nudity (Uncensored)' },
    { key: 'masturbation', label: 'Masturbation' },
    { key: 'analContent', label: 'Anal Content' },
    { key: 'feetContent', label: 'Feet Content' },
  ];

  const handleToggle = (key: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }));
    setHasUnsavedChanges(true);
  };

  // Grouped questionnaire fields
  const identityFields = [
    { key: 'publicName', label: 'Public Name', type: 'text' },
    { key: 'publicNicknames', label: 'Public Nicknames', type: 'text' },
    { key: 'publicBirthday', label: 'Public Birthday', type: 'date' },
    { key: 'gender', label: 'Gender', type: 'text' },
    { key: 'sexualOrientation', label: 'Sexual Orientation', type: 'select', options: ['Straight', 'Bi-sexual', 'Gay'] },
    { key: 'relationshipStatus', label: 'Relationship Status', type: 'select', options: ['Single', 'Taken', 'Situationship'] },
  ];

  const physicalFields = [
    { key: 'ethnicity', label: 'Ethnicity/Race', type: 'text' },
    { key: 'height', label: 'Height', type: 'text' },
    { key: 'weight', label: 'Weight', type: 'text' },
    { key: 'shoeSize', label: 'Shoe Size', type: 'text' },
    { key: 'braSize', label: 'Bra Size', type: 'text' },
    { key: 'zodiacSign', label: 'Zodiac Sign', type: 'text' },
    { key: 'favoriteColors', label: 'Favorite Colors', type: 'text' },
  ];

  const lifestyleFields = [
    { key: 'nativeLanguage', label: 'Native Language', type: 'text' },
    { key: 'otherLanguages', label: 'Other Languages', type: 'text' },
    { key: 'birthPlace', label: 'Where Were You Born', type: 'text' },
    { key: 'currentLocation', label: 'Current Location', type: 'text' },
    { key: 'hobbies', label: 'Hobbies', type: 'textarea' },
    { key: 'college', label: 'College', type: 'text' },
    { key: 'currentCar', label: 'Current Car', type: 'text' },
    { key: 'dreamCar', label: 'Dream Car', type: 'text' },
    { key: 'pets', label: 'Pets', type: 'textarea' },
    { key: 'favoritePlaceTraveled', label: 'Favorite Place Traveled', type: 'text' },
    { key: 'dreamDestination', label: 'Dream Destination', type: 'text' },
    { key: 'dreamDate', label: 'Dream Date', type: 'textarea' },
    { key: 'hasChildren', label: 'Do You Have Children', type: 'select', options: ['Yes', 'No'] },
    { key: 'otherCareer', label: 'Other Career', type: 'textarea' },
    { key: 'weekdayRoutine', label: 'Weekday Routine', type: 'textarea' },
    { key: 'weekendRoutine', label: 'Weekend Routine', type: 'textarea' },
  ];

  const boundariesFields = [
    { key: 'hardNos', label: "Hard No's / Boundaries", type: 'textarea' },
    { key: 'knownFrom', label: 'Where Fans Know You From', type: 'textarea' },
    { key: 'additionalInfo', label: 'Additional Info for Representation', type: 'textarea' },
  ];

  const personaOptions = [
    'Flirty', 'Playful', 'Dominant', 'Submissive', 'Sweet',
    'Shy', 'Confident', 'Serious', 'Seductive', 'Funny', 'Mysterious'
  ];

  const detailContentTypes = [
    { key: 'buttContent', label: 'Butt Pictures/Videos' },
    { key: 'breastContent', label: 'Breast Pictures/Videos' },
    { key: 'visibleNipples', label: 'Visible Nipples' },
    { key: 'girlGirlContent', label: 'Girl/Girl Content' },
    { key: 'boyGirlContent', label: 'Boy/Girl Content' },
    { key: 'twerkVideos', label: 'Twerk Videos' },
    { key: 'fullNudityCensored', label: 'Full Nudity Censored' },
    { key: 'fullNudityUncensored', label: 'Full Nudity Uncensored' },
    { key: 'masturbation', label: 'Masturbation' },
    { key: 'fetishKink', label: 'Fetish/Kink Content' },
    { key: 'feet', label: 'Feet' },
    { key: 'dickRates', label: 'Dick Rates' },
    { key: 'customRequests', label: 'Custom Requests' },
  ];

  const handleQuestionnaireChange = (key: string, value: string) => {
    setQuestionnaireData(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const handlePersonaToggle = (persona: string) => {
    setSelectedPersonas(prev => 
      prev.includes(persona) ? prev.filter(p => p !== persona) : [...prev, persona]
    );
    setHasUnsavedChanges(true);
  };

  const handleDropdownSelect = (fieldKey: string, value: string) => {
    handleQuestionnaireChange(fieldKey, value);
    setOpenDropdown(null);
  };

  const handleDetailToggle = (key: string, value: boolean) => {
    setContentDetails(prev => ({ ...prev, [key]: { ...prev[key], enabled: value } }));
    setHasUnsavedChanges(true);
  };

  const handlePriceChange = (key: string, field: 'priceMin' | 'priceMax', value: number) => {
    setContentDetails(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setHasUnsavedChanges(true);
  };

  const handlePersonalInfoChange = (key: string, value: string) => {
    setPersonalInfo(prev => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  };

  const platformOptions = ['OnlyFans', 'SextPanther', 'Fansly', 'Fanvue', 'Alua', 'Playboy'];
  
  const addPlatformCredential = (platform: string) => {
    setPlatformCredentials(prev => [
      ...prev,
      { id: Date.now().toString(), platform, email: '', password: '' }
    ]);
    setShowPlatformDropdown(false);
    setHasUnsavedChanges(true);
  };

  const updatePlatformCredential = (id: string, field: 'email' | 'password', value: string) => {
    setPlatformCredentials(prev =>
      prev.map(cred => cred.id === id ? { ...cred, [field]: value } : cred)
    );
    setHasUnsavedChanges(true);
  };

  const removePlatformCredential = (id: string) => {
    setPlatformCredentials(prev => prev.filter(cred => cred.id !== id));
    setHasUnsavedChanges(true);
  };

  const socialPlatformOptions = ['Instagram', 'X', 'TikTok', 'Reddit', 'Other'];
  
  const addSocialAccount = (platform: string) => {
    setSocialMediaAccounts(prev => [
      ...prev,
      { id: Date.now().toString(), platform, username: '' }
    ]);
    setShowSocialDropdown(false);
    setHasUnsavedChanges(true);
  };

  const updateSocialAccount = (id: string, value: string) => {
    setSocialMediaAccounts(prev =>
      prev.map(acc => acc.id === id ? { ...acc, username: value } : acc)
    );
    setHasUnsavedChanges(true);
  };

  const removeSocialAccount = (id: string) => {
    setSocialMediaAccounts(prev => prev.filter(acc => acc.id !== id));
    setHasUnsavedChanges(true);
  };

  // Calculate completion counts
  const getCompletedCount = (fields: Array<{ key: string }>) => {
    return fields.filter(f => questionnaireData[f.key]?.trim()).length;
  };

  const personalInfoCompleted = Object.values(personalInfo).filter(v => v?.trim()).length;
  const enabledContentTypes = Object.values(contentDetails).filter(c => c.enabled).length;

  // Render a form field
  const renderField = (field: { key: string; label: string; type: string; options?: string[] }) => {
    if (field.type === 'textarea') {
      return (
        <textarea
          value={questionnaireData[field.key] || ''}
          onChange={(e) => handleQuestionnaireChange(field.key, e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
          placeholder="Enter your answer..."
          rows={2}
        />
      );
    } else if (field.type === 'date') {
      return (
        <input
          type="date"
          value={questionnaireData[field.key] || ''}
          onChange={(e) => handleQuestionnaireChange(field.key, e.target.value)}
          className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        />
      );
    } else if (field.type === 'select') {
      return (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenDropdown(openDropdown === field.key ? null : field.key)}
            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
          >
            <span className={questionnaireData[field.key] ? 'text-gray-900' : 'text-gray-400'}>
              {questionnaireData[field.key] || 'Select...'}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openDropdown === field.key ? 'rotate-180' : ''}`} />
          </button>
          
          {openDropdown === field.key && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
              <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {field.options?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleDropdownSelect(field.key, option)}
                    className={`w-full px-3 py-2.5 text-left text-sm hover:bg-purple-50 transition-colors flex items-center justify-between ${
                      questionnaireData[field.key] === option ? 'bg-purple-50 text-purple-600' : 'text-gray-900'
                    }`}
                  >
                    <span>{option}</span>
                    {questionnaireData[field.key] === option && <Check className="w-4 h-4 text-purple-600" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }
    
    return (
      <input
        type="text"
        value={questionnaireData[field.key] || ''}
        onChange={(e) => handleQuestionnaireChange(field.key, e.target.value)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        placeholder="Enter your answer..."
      />
    );
  };

  return (
    <>
      <div className="space-y-4 pb-28">
        {/* Enhanced Pill Tabs */}
        <div className="bg-gray-100 p-1.5 rounded-2xl">
          <div className="flex">
            <button
              onClick={() => setActiveTab('customs')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'customs'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              Customs
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                activeTab === 'details'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-4 h-4" />
              Details
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'customs' ? (
          <div className="space-y-4">
            {/* Minimum Pricing */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Minimum Pricing</h3>
                  <p className="text-xs text-gray-500">Your base rate for customs</p>
                </div>
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="number"
                  value={formData.minimumPricing}
                  onChange={(e) => {
                    setFormData({ ...formData, minimumPricing: parseFloat(e.target.value) || 0 });
                    setHasUnsavedChanges(true);
                  }}
                  className="block w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Content Preferences */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                  <Heart className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Content Preferences</h3>
                  <p className="text-xs text-gray-500">What you're comfortable with</p>
                </div>
              </div>

              <div className="space-y-2">
                {contentTypes.map((contentType) => (
                  <div key={contentType.key} className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">{contentType.label}</span>
                    <button
                      onClick={() => handleToggle(contentType.key)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        formData[contentType.key as keyof typeof formData] ? 'bg-purple-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          formData[contentType.key as keyof typeof formData] ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Personal Information */}
            <AccordionSection
              id="personalInfo"
              title="Personal Information"
              subtitle="Basic details about you"
              icon={<User className="w-5 h-5 text-purple-600" />}
              iconBgColor="bg-purple-100"
              isOpen={openSections.personalInfo}
              onToggle={() => toggleSection('personalInfo')}
              completedCount={personalInfoCompleted}
              totalCount={5}
            >
              <div className="space-y-3">
                {[
                  { key: 'legalName', label: 'Legal Name', type: 'text' },
                  { key: 'email', label: 'Email', type: 'email' },
                  { key: 'phone', label: 'Phone', type: 'tel' },
                  { key: 'dateOfBirth', label: 'Date of Birth', type: 'date' },
                  { key: 'address', label: 'Address', type: 'textarea' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={personalInfo[field.key as keyof typeof personalInfo]}
                        onChange={(e) => handlePersonalInfoChange(field.key, e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none transition-all"
                        rows={2}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={personalInfo[field.key as keyof typeof personalInfo]}
                        onChange={(e) => handlePersonalInfoChange(field.key, e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </AccordionSection>

            {/* Platform Credentials */}
            <AccordionSection
              id="credentials"
              title="Platform Credentials"
              subtitle="Login info for your platforms"
              icon={<Lock className="w-5 h-5 text-pink-600" />}
              iconBgColor="bg-pink-100"
              isOpen={openSections.credentials}
              onToggle={() => toggleSection('credentials')}
              completedCount={platformCredentials.length}
              totalCount={platformCredentials.length || 1}
            >
              <div className="space-y-3">
                {platformCredentials.map((cred) => (
                  <div key={cred.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{cred.platform}</span>
                      <button onClick={() => removePlatformCredential(cred.id)} className="text-xs text-red-500 font-medium">
                        Remove
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="email"
                        value={cred.email}
                        onChange={(e) => updatePlatformCredential(cred.id, 'email', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        placeholder="Email"
                      />
                      <input
                        type="password"
                        value={cred.password}
                        onChange={(e) => updatePlatformCredential(cred.id, 'password', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        placeholder="Password"
                      />
                    </div>
                  </div>
                ))}
                
                <div className="relative">
                  <button
                    onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                    className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors"
                  >
                    + Add Platform
                  </button>
                  {showPlatformDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowPlatformDropdown(false)} />
                      <div className="absolute z-20 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                        {platformOptions.map((platform) => (
                          <button
                            key={platform}
                            onClick={() => addPlatformCredential(platform)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm transition-colors"
                          >
                            {platform}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </AccordionSection>

            {/* Social Media */}
            <AccordionSection
              id="socialMedia"
              title="Social Media"
              subtitle="Your social handles"
              icon={<Share2 className="w-5 h-5 text-blue-600" />}
              iconBgColor="bg-blue-100"
              isOpen={openSections.socialMedia}
              onToggle={() => toggleSection('socialMedia')}
              completedCount={socialMediaAccounts.length}
              totalCount={socialMediaAccounts.length || 1}
            >
              <div className="space-y-3">
                {socialMediaAccounts.map((acc) => (
                  <div key={acc.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{acc.platform}</span>
                      <button onClick={() => removeSocialAccount(acc.id)} className="text-xs text-red-500 font-medium">
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={acc.username}
                      onChange={(e) => updateSocialAccount(acc.id, e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                      placeholder="@username"
                    />
                  </div>
                ))}
                
                <div className="relative">
                  <button
                    onClick={() => setShowSocialDropdown(!showSocialDropdown)}
                    className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
                  >
                    + Add Account
                  </button>
                  {showSocialDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowSocialDropdown(false)} />
                      <div className="absolute z-20 w-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                        {socialPlatformOptions.map((platform) => (
                          <button
                            key={platform}
                            onClick={() => addSocialAccount(platform)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm transition-colors"
                          >
                            {platform}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </AccordionSection>

            {/* Identity & Public Info */}
            <AccordionSection
              id="identity"
              title="Identity & Public Info"
              subtitle="How fans will know you"
              icon={<Sparkles className="w-5 h-5 text-amber-600" />}
              iconBgColor="bg-amber-100"
              isOpen={openSections.identity}
              onToggle={() => toggleSection('identity')}
              completedCount={getCompletedCount(identityFields)}
              totalCount={identityFields.length}
            >
              <div className="space-y-3">
                {identityFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{field.label}</label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </AccordionSection>

            {/* Physical Attributes */}
            <AccordionSection
              id="physical"
              title="Physical Attributes"
              subtitle="Your measurements & appearance"
              icon={<User className="w-5 h-5 text-rose-600" />}
              iconBgColor="bg-rose-100"
              isOpen={openSections.physical}
              onToggle={() => toggleSection('physical')}
              completedCount={getCompletedCount(physicalFields)}
              totalCount={physicalFields.length}
            >
              <div className="grid grid-cols-2 gap-3">
                {physicalFields.map((field) => (
                  <div key={field.key} className={field.key === 'favoriteColors' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{field.label}</label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </AccordionSection>

            {/* Lifestyle */}
            <AccordionSection
              id="lifestyle"
              title="Lifestyle & Interests"
              subtitle="More about your life"
              icon={<MapPin className="w-5 h-5 text-teal-600" />}
              iconBgColor="bg-teal-100"
              isOpen={openSections.lifestyle}
              onToggle={() => toggleSection('lifestyle')}
              completedCount={getCompletedCount(lifestyleFields)}
              totalCount={lifestyleFields.length}
            >
              <div className="space-y-3">
                {lifestyleFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{field.label}</label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </AccordionSection>

            {/* Boundaries */}
            <AccordionSection
              id="boundaries"
              title="Boundaries & Notes"
              subtitle="What's off limits"
              icon={<Shield className="w-5 h-5 text-red-600" />}
              iconBgColor="bg-red-100"
              isOpen={openSections.boundaries}
              onToggle={() => toggleSection('boundaries')}
              completedCount={getCompletedCount(boundariesFields)}
              totalCount={boundariesFields.length}
            >
              <div className="space-y-3">
                {boundariesFields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{field.label}</label>
                    {renderField(field)}
                  </div>
                ))}
              </div>
            </AccordionSection>

            {/* Personas */}
            <AccordionSection
              id="personas"
              title="Public Persona"
              subtitle="Your vibe and personality"
              icon={<Heart className="w-5 h-5 text-pink-600" />}
              iconBgColor="bg-pink-100"
              isOpen={openSections.personas}
              onToggle={() => toggleSection('personas')}
              completedCount={selectedPersonas.length > 0 ? 1 : 0}
              totalCount={1}
            >
              <div className="flex flex-wrap gap-2">
                {personaOptions.map((persona) => (
                  <button
                    key={persona}
                    onClick={() => handlePersonaToggle(persona)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      selectedPersonas.includes(persona)
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {persona}
                  </button>
                ))}
              </div>
              {selectedPersonas.length > 0 && (
                <p className="text-xs text-gray-500 mt-3">Selected: {selectedPersonas.join(', ')}</p>
              )}
            </AccordionSection>

            {/* Content Pricing */}
            <AccordionSection
              id="contentPricing"
              title="Content Pricing"
              subtitle="Set prices for content types"
              icon={<DollarSign className="w-5 h-5 text-green-600" />}
              iconBgColor="bg-green-100"
              isOpen={openSections.contentPricing}
              onToggle={() => toggleSection('contentPricing')}
              completedCount={enabledContentTypes}
              totalCount={detailContentTypes.length}
            >
              <div className="space-y-2">
                {detailContentTypes.map((contentType) => (
                  <div key={contentType.key} className="bg-gray-50 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between p-3">
                      <span className="text-sm font-medium text-gray-700">{contentType.label}</span>
                      <button
                        onClick={() => handleDetailToggle(contentType.key, !contentDetails[contentType.key].enabled)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          contentDetails[contentType.key].enabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            contentDetails[contentType.key].enabled ? 'translate-x-5' : ''
                          }`}
                        />
                      </button>
                    </div>
                    
                    {contentDetails[contentType.key].enabled && (
                      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Min $</label>
                          <input
                            type="number"
                            value={contentDetails[contentType.key].priceMin}
                            onChange={(e) => handlePriceChange(contentType.key, 'priceMin', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Max $</label>
                          <input
                            type="number"
                            value={contentDetails[contentType.key].priceMax}
                            onChange={(e) => handlePriceChange(contentType.key, 'priceMax', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm"
                            min="0"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionSection>
          </div>
        )}
      </div>

      {/* Sticky Save Footer */}
      <div className="fixed bottom-20 left-0 right-0 px-5 z-40">
        <button
          onClick={handleSave}
          disabled={loading}
          className={`w-full py-3.5 rounded-2xl font-bold text-base shadow-lg transition-all duration-200 flex items-center justify-center gap-2 ${
            hasUnsavedChanges
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-xl active:scale-[0.98]'
              : 'bg-gray-100 text-gray-400'
          }`}
          style={hasUnsavedChanges ? { boxShadow: '0 8px 24px rgba(168, 85, 247, 0.35)' } : {}}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {hasUnsavedChanges ? 'Save Changes' : 'All Saved'}
            </>
          )}
        </button>
      </div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
    </>
  );
};

export default MobileSettingsView;
