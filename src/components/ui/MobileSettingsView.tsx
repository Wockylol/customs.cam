import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Save, DollarSign, Settings, CheckCircle, AlertCircle, User, ChevronDown, Check } from 'lucide-react';
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

const MobileSettingsView: React.FC<MobileSettingsViewProps> = ({ 
  client, 
  preferences, 
  onSave 
}) => {
  console.log('MobileSettingsView rendering with client:', client);
  
  const [activeTab, setActiveTab] = useState<'customs' | 'details'>('customs');
  
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
  
  console.log('Hook loaded - Client ID:', client?.id);
  console.log('Existing questionnaire:', existingQuestionnaire);
  console.log('Existing personas:', existingPersonas);
  console.log('Existing content details:', existingContentDetails);
  
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
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  
  // Track unsaved changes for reminder
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSaveReminder, setShowSaveReminder] = useState(false);

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
    console.log('=== HANDLE SAVE CALLED ===');
    console.log('Active Tab:', activeTab);
    console.log('Client ID:', client?.id);
    
    setLoading(true);
    setError(null);
    
    try {
      if (activeTab === 'customs') {
        console.log('Saving CUSTOMS tab data...');
        // Save customs preferences (existing functionality)
        const { error } = await onSave(formData);
        if (error) throw new Error(error);
      } else if (activeTab === 'details') {
        console.log('Saving DETAILS tab data...');
        console.log('Personal Info:', personalInfo);
        console.log('Platform Credentials:', platformCredentials);
        console.log('Social Media:', socialMediaAccounts);
        console.log('Questionnaire Data:', questionnaireData);
        console.log('Selected Personas:', selectedPersonas);
        console.log('Content Details:', contentDetails);
        
        // Save personal info
        const personalInfoError = await savePersonalInfo(personalInfo);
        console.log('Personal info save result:', personalInfoError);
        if (personalInfoError.error) throw new Error(personalInfoError.error);
        
        // Save platform credentials
        const credentialsError = await savePlatformCredentials(platformCredentials);
        console.log('Platform credentials save result:', credentialsError);
        if (credentialsError.error) throw new Error(credentialsError.error);
        
        // Save social media accounts
        const socialError = await saveSocialMediaAccounts(socialMediaAccounts);
        console.log('Social media save result:', socialError);
        if (socialError.error) throw new Error(socialError.error);
        
        // Save questionnaire data
        const questionnaireError = await saveQuestionnaire(questionnaireData);
        console.log('Questionnaire save result:', questionnaireError);
        if (questionnaireError.error) throw new Error(questionnaireError.error);
        
        // Save personas
        const personasError = await savePersonas(selectedPersonas);
        console.log('Personas save result:', personasError);
        if (personasError.error) throw new Error(personasError.error);
        
        // Save content details
        const contentError = await saveAllContentDetails(contentDetails);
        console.log('Content details save result:', contentError);
        if (contentError.error) throw new Error(contentError.error);
      }
      
      console.log('=== SAVE COMPLETED SUCCESSFULLY ===');
      setToastMessage('Settings saved successfully! ✨');
      setToastType('success');
      setShowToast(true);
      
      // Reset unsaved changes flags
      setHasUnsavedChanges(false);
      setShowSaveReminder(false);
    } catch (err: any) {
      console.error('=== SAVE FAILED ===');
      console.error('Error:', err);
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
  };

  const questionnaireFields = [
    { key: 'publicName', label: 'Public Name', type: 'text' },
    { key: 'publicNicknames', label: 'Public Nicknames', type: 'text' },
    { key: 'publicBirthday', label: 'Public Birthday', type: 'date' },
    { key: 'gender', label: 'Gender', type: 'text' },
    { key: 'nativeLanguage', label: 'Native Language', type: 'text' },
    { key: 'otherLanguages', label: 'Other Spoken Languages', type: 'text' },
    { key: 'sexualOrientation', label: 'Public Sexual Orientation', type: 'select', options: ['Straight', 'Bi-sexual', 'Gay'] },
    { key: 'ethnicity', label: 'Ethnicity/Race', type: 'text' },
    { key: 'height', label: 'Height', type: 'text' },
    { key: 'weight', label: 'Weight', type: 'text' },
    { key: 'shoeSize', label: 'Shoe Size', type: 'text' },
    { key: 'braSize', label: 'Bra Size', type: 'text' },
    { key: 'zodiacSign', label: 'Zodiac Sign', type: 'text' },
    { key: 'favoriteColors', label: 'Favorite Color(s)', type: 'text' },
    { key: 'birthPlace', label: 'Where Were You Born', type: 'text' },
    { key: 'currentLocation', label: 'Where Do You Currently Live', type: 'text' },
    { key: 'hobbies', label: 'Hobbies', type: 'textarea' },
    { key: 'college', label: 'Did You Go to College? If So, Where?', type: 'text' },
    { key: 'currentCar', label: 'What Kind of Car Do You Drive', type: 'text' },
    { key: 'dreamCar', label: 'Dream Car', type: 'text' },
    { key: 'pets', label: 'Do You Have Any Animals? If So, What/Name/Age?', type: 'textarea' },
    { key: 'favoritePlaceTraveled', label: 'Favorite Place Traveled', type: 'text' },
    { key: 'dreamDestination', label: 'Dream Destination', type: 'text' },
    { key: 'relationshipStatus', label: 'Public Relationship Status', type: 'select', options: ['Single', 'Taken', 'Situationship'] },
    { key: 'dreamDate', label: 'Describe Your Dream Date', type: 'textarea' },
    { key: 'hasChildren', label: 'Do You Have Children', type: 'select', options: ['Yes', 'No'] },
    { key: 'otherCareer', label: 'What Else Do You Do Career Wise', type: 'textarea' },
    { key: 'knownFrom', label: 'List Anything/Anywhere Your Fans Could Know You From Other Than Social Media', type: 'textarea' },
    { key: 'additionalInfo', label: 'Anything Else Specific You Would Like Your Fans to Know or Specific Requests of How You Would Like Us to Represent You?', type: 'textarea' },
    { key: 'hardNos', label: "Hard No's/No Tolerance Topics", type: 'textarea' },
    { key: 'weekdayRoutine', label: 'Describe an Average Day in the Life on a Weekday for You', type: 'textarea' },
    { key: 'weekendRoutine', label: 'Describe an Average Day in the Life on a Weekend for You', type: 'textarea' },
  ];

  const personaOptions = [
    'Flirty',
    'Playful',
    'Dominant',
    'Submissive',
    'Sweet',
    'Shy',
    'Confident',
    'Serious',
    'Seductive',
    'Funny',
    'Mysterious'
  ];

  const detailContentTypes = [
    { key: 'buttContent', label: 'Butt Pictures/Videos' },
    { key: 'breastContent', label: 'Breast Pictures/Videos' },
    { key: 'visibleNipples', label: 'Visible Nipples Pictures/Videos' },
    { key: 'girlGirlContent', label: 'Girl/Girl Pictures/Videos' },
    { key: 'boyGirlContent', label: 'Boy/Girl Pictures/Videos' },
    { key: 'twerkVideos', label: 'Twerk Videos' },
    { key: 'fullNudityCensored', label: 'Full Nudity Censored' },
    { key: 'fullNudityUncensored', label: 'Full Nudity Uncensored' },
    { key: 'masturbation', label: 'Masturbation Pictures/Videos' },
    { key: 'fetishKink', label: 'Fetish/Kink Content' },
    { key: 'feet', label: 'Feet' },
    { key: 'dickRates', label: 'Dick Rates' },
    { key: 'customRequests', label: 'Custom Requests' },
  ];

  const handleQuestionnaireChange = (key: string, value: string) => {
    setQuestionnaireData(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Show save reminder on first change
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
      setShowSaveReminder(true);
    }
  };

  const handlePersonaToggle = (persona: string) => {
    setSelectedPersonas(prev => 
      prev.includes(persona)
        ? prev.filter(p => p !== persona)
        : [...prev, persona]
    );
    
    // Show save reminder on first change
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
      setShowSaveReminder(true);
    }
  };

  const handleDropdownSelect = (fieldKey: string, value: string) => {
    handleQuestionnaireChange(fieldKey, value);
    setOpenDropdown(null);
  };

  const toggleDropdown = (fieldKey: string) => {
    setOpenDropdown(openDropdown === fieldKey ? null : fieldKey);
  };

  const handleDetailToggle = (key: string, value: boolean) => {
    setContentDetails(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: value }
    }));
    
    // Show save reminder on first change
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
      setShowSaveReminder(true);
    }
  };

  const handlePriceChange = (key: string, field: 'priceMin' | 'priceMax', value: number) => {
    setContentDetails(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
    
    // Show save reminder on first change
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
      setShowSaveReminder(true);
    }
  };

  // Personal Info Handlers
  const handlePersonalInfoChange = (key: string, value: string) => {
    setPersonalInfo(prev => ({
      ...prev,
      [key]: value
    }));
    
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
      setShowSaveReminder(true);
    }
  };

  // Platform Credentials Handlers
  const platformOptions = ['OnlyFans', 'SextPanther', 'Fansly', 'Fanvue', 'Alua', 'Playboy'];
  
  const addPlatformCredential = (platform: string) => {
    setPlatformCredentials(prev => [
      ...prev,
      { id: Date.now().toString(), platform, email: '', password: '' }
    ]);
    setShowPlatformDropdown(false);
    
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
      setShowSaveReminder(true);
    }
  };

  const updatePlatformCredential = (id: string, field: 'email' | 'password', value: string) => {
    setPlatformCredentials(prev =>
      prev.map(cred => cred.id === id ? { ...cred, [field]: value } : cred)
    );
  };

  const removePlatformCredential = (id: string) => {
    setPlatformCredentials(prev => prev.filter(cred => cred.id !== id));
  };

  // Social Media Handlers
  const socialPlatformOptions = ['Instagram', 'X', 'TikTok', 'Reddit', 'Other'];
  
  const addSocialAccount = (platform: string) => {
    setSocialMediaAccounts(prev => [
      ...prev,
      { id: Date.now().toString(), platform, username: '' }
    ]);
    setShowSocialDropdown(false);
    
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
      setShowSaveReminder(true);
    }
  };

  const updateSocialAccount = (id: string, value: string) => {
    setSocialMediaAccounts(prev =>
      prev.map(acc => acc.id === id ? { ...acc, username: value } : acc)
    );
  };

  const removeSocialAccount = (id: string) => {
    setSocialMediaAccounts(prev => prev.filter(acc => acc.id !== id));
  };

  return (
    <>
      {/* Fixed Floating Save Button - rendered via portal to ensure true viewport fixed positioning */}
      {typeof document !== 'undefined' && ReactDOM.createPortal(
        <button
          onClick={handleSave}
          disabled={loading}
          className="fixed right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-full shadow-2xl hover:shadow-xl transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center font-bold text-lg"
          style={{
            top: '180px',
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(168, 85, 247, 0.4)'
          }}
          title={activeTab === 'customs' ? 'Save Preferences' : 'Save Details'}
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Saving...</span>
            </div>
          ) : (
            <span>Save</span>
          )}
        </button>,
        document.body
      )}

    <div className="space-y-6 pre-animate animate-slide-up pb-24" style={{ animationDelay: '0.1s' }}>
      {/* Browser-Style Tabs */}
      <div className="bg-white rounded-t-2xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setActiveTab('customs')}
            className={`flex-1 px-6 py-4 text-sm font-semibold relative border-b-2 ${
              activeTab === 'customs'
                ? 'bg-white text-purple-600 border-purple-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-transparent'
            }`}
            style={{ 
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              transition: 'background-color 0.2s, color 0.2s'
            }}
          >
            <div className="flex items-center justify-center">
              <Settings className="w-4 h-4 mr-2" />
              Customs
            </div>
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-6 py-4 text-sm font-semibold relative border-b-2 ${
              activeTab === 'details'
                ? 'bg-white text-purple-600 border-purple-600'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-transparent'
            }`}
            style={{ 
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              transition: 'background-color 0.2s, color 0.2s'
            }}
          >
            <div className="flex items-center justify-center">
              <User className="w-4 h-4 mr-2" />
              Details
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'customs' ? (
        // Customs Tab Content (Original Settings)
        <>
      {/* Minimum Pricing Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Minimum Pricing</h3>
            <p className="text-sm text-gray-600">Set your base rate for customs</p>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Price ($)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              value={formData.minimumPricing}
              onChange={(e) => setFormData({ ...formData, minimumPricing: parseFloat(e.target.value) || 0 })}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="0"
              min="0"
              step="0.01"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            This is the minimum amount you'll accept for custom requests
          </p>
        </div>
      </div>

      {/* Content Preferences Section */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center mb-6">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
            <Settings className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Preferences</h3>
            <p className="text-sm text-gray-600">What content types you're comfortable with</p>
          </div>
        </div>

        <div className="space-y-3">
          {contentTypes.map((contentType) => (
            <div key={contentType.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <label className="text-sm font-medium text-gray-900 flex-1 cursor-pointer">
                {contentType.label}
              </label>
              <button
                onClick={() => handleToggle(contentType.key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                  formData[contentType.key as keyof typeof formData]
                    ? 'bg-purple-600'
                    : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData[contentType.key as keyof typeof formData]
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

        </>
      ) : (
        // Details Tab Content
        <>
          {/* Questionnaire Section */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            {/* Personal Information Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mr-3">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                  <p className="text-sm text-gray-600">Basic personal details</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Legal Name</label>
                  <input
                    type="text"
                    value={personalInfo.legalName}
                    onChange={(e) => handlePersonalInfoChange('legalName', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter legal name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={personalInfo.email}
                    onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="tel"
                    value={personalInfo.phone}
                    onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Date of Birth</label>
                  <input
                    type="date"
                    value={personalInfo.dateOfBirth}
                    onChange={(e) => handlePersonalInfoChange('dateOfBirth', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Address</label>
                  <textarea
                    value={personalInfo.address}
                    onChange={(e) => handlePersonalInfoChange('address', e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                    rows={3}
                    placeholder="Enter address"
                  />
                </div>
              </div>
            </div>

            {/* Credentials Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center mr-3">
                    <Settings className="w-5 h-5 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Credentials</h3>
                    <p className="text-sm text-gray-600">Platform login information</p>
                  </div>
                </div>
                
                <div className="relative">
                  <button
                    onClick={() => setShowPlatformDropdown(!showPlatformDropdown)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                  >
                    + Platform
                  </button>
                  
                  {showPlatformDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-10">
                      {platformOptions.map((platform) => (
                        <button
                          key={platform}
                          onClick={() => addPlatformCredential(platform)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors text-sm"
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {platformCredentials.map((cred) => (
                  <div key={cred.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-gray-900">{cred.platform}</span>
                      <button
                        onClick={() => removePlatformCredential(cred.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="space-y-3">
                      <input
                        type="email"
                        value={cred.email}
                        onChange={(e) => updatePlatformCredential(cred.id, 'email', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="Email"
                      />
                      <input
                        type="password"
                        value={cred.password}
                        onChange={(e) => updatePlatformCredential(cred.id, 'password', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        placeholder="Password"
                      />
                    </div>
                  </div>
                ))}
                
                {platformCredentials.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">No platforms added yet</p>
                )}
              </div>
            </div>

            {/* Social Media Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Social Media</h3>
                    <p className="text-sm text-gray-600">Social media account handles</p>
                  </div>
                </div>
                
                <div className="relative">
                  <button
                    onClick={() => setShowSocialDropdown(!showSocialDropdown)}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
                  >
                    + Account
                  </button>
                  
                  {showSocialDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-10">
                      {socialPlatformOptions.map((platform) => (
                        <button
                          key={platform}
                          onClick={() => addSocialAccount(platform)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 first:rounded-t-xl last:rounded-b-xl transition-colors text-sm"
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {socialMediaAccounts.map((acc) => (
                  <div key={acc.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-gray-900">{acc.platform}</span>
                      <button
                        onClick={() => removeSocialAccount(acc.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={acc.username}
                      onChange={(e) => updateSocialAccount(acc.id, e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="@username"
                    />
                  </div>
                ))}
                
                {socialMediaAccounts.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">No accounts added yet</p>
                )}
              </div>
            </div>

            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Profile Information</h3>
                <p className="text-sm text-gray-600">Answer these questions about yourself</p>
              </div>
            </div>

            <div className="space-y-4">
              {questionnaireFields.map((field) => (
                <div key={field.key} className="bg-gray-50 rounded-xl p-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={questionnaireData[field.key]}
                      onChange={(e) => handleQuestionnaireChange(field.key, e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder={`Enter your answer...`}
                      rows={3}
                    />
                  ) : field.type === 'date' ? (
                    <input
                      type="date"
                      value={questionnaireData[field.key]}
                      onChange={(e) => handleQuestionnaireChange(field.key, e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : field.type === 'select' ? (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => toggleDropdown(field.key)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all hover:border-gray-400"
                      >
                        <span className={questionnaireData[field.key] ? 'text-gray-900' : 'text-gray-400'}>
                          {questionnaireData[field.key] || 'Select an option...'}
                        </span>
                        <ChevronDown 
                          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                            openDropdown === field.key ? 'transform rotate-180' : ''
                          }`}
                        />
                      </button>
                      
                      {openDropdown === field.key && (
                        <>
                          <div 
                            className="fixed inset-0 z-10" 
                            onClick={() => setOpenDropdown(null)}
                          />
                          <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                            {field.options?.map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => handleDropdownSelect(field.key, option)}
                                className={`w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors flex items-center justify-between ${
                                  questionnaireData[field.key] === option ? 'bg-blue-50 text-blue-600' : 'text-gray-900'
                                }`}
                              >
                                <span>{option}</span>
                                {questionnaireData[field.key] === option && (
                                  <Check className="w-4 h-4 text-blue-600" />
                                )}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={questionnaireData[field.key]}
                      onChange={(e) => handleQuestionnaireChange(field.key, e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={`Enter your answer...`}
                    />
                  )}
                </div>
              ))}

              {/* Public Persona Selection */}
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Select Your Public Persona(s)
                </label>
                <div className="flex flex-wrap gap-2">
                  {personaOptions.map((persona) => (
                    <button
                      key={persona}
                      onClick={() => handlePersonaToggle(persona)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedPersonas.includes(persona)
                          ? 'bg-purple-600 text-white ring-2 ring-purple-400 shadow-sm'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-400 hover:text-purple-600'
                      }`}
                    >
                      {persona}
                    </button>
                  ))}
                </div>
                {selectedPersonas.length > 0 && (
                  <p className="text-xs text-gray-600 mt-3">
                    Selected: {selectedPersonas.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Content Pricing Section */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <div className="flex items-center mb-6">
              <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center mr-3">
                <Settings className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Content Pricing</h3>
                <p className="text-sm text-gray-600">Select what content you will display and set price ranges</p>
              </div>
            </div>

            <div className="space-y-3">
              {detailContentTypes.map((contentType) => (
                <div key={contentType.key} className="bg-gray-50 rounded-xl overflow-hidden">
                  {/* Content Type Toggle */}
                  <div className="flex items-center justify-between p-3">
                    <label className="text-sm font-medium text-gray-900 flex-1 cursor-pointer">
                      {contentType.label}
                    </label>
                    <button
                      onClick={() => handleDetailToggle(contentType.key, !contentDetails[contentType.key].enabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
                        contentDetails[contentType.key].enabled
                          ? 'bg-purple-600'
                          : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          contentDetails[contentType.key].enabled
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Price Range Fields */}
                  {contentDetails[contentType.key].enabled && (
                    <div className="grid grid-cols-2 gap-3 p-3 pt-0">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Min Price
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="number"
                            value={contentDetails[contentType.key].priceMin}
                            onChange={(e) => handlePriceChange(contentType.key, 'priceMin', parseFloat(e.target.value) || 0)}
                            className="block w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Max Price
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="number"
                            value={contentDetails[contentType.key].priceMax}
                            onChange={(e) => handlePriceChange(contentType.key, 'priceMax', parseFloat(e.target.value) || 0)}
                            className="block w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </>
      )}
      </div>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
        duration={3000}
      />
      
      {/* Save Reminder - Rendered via Portal to document.body for true viewport centering */}
      {showSaveReminder && activeTab === 'details' && typeof document !== 'undefined' && ReactDOM.createPortal(
        <>
          {/* Backdrop blur */}
          <div 
            className="fixed inset-0 z-[9998] bg-black/10 backdrop-blur-sm"
            onClick={() => setShowSaveReminder(false)}
          />
          
          {/* Notification card */}
          <div 
            className="fixed left-1/2 top-1/2 z-[9999]"
            style={{ 
              transform: 'translate(-50%, -50%)',
              animation: 'slideInScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}
          >
            <div className="mx-4 w-[280px]">
              <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                {/* Gradient accent */}
                <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"></div>
                
                {/* Content */}
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl flex items-center justify-center">
                        <Save className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>
                    
                    {/* Text content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-gray-900 mb-0.5">
                        Don't Forget to Save!
                      </h3>
                      <p className="text-xs text-gray-500">
                        You have unsaved changes
                      </p>
                    </div>
                    
                    {/* Close button */}
                    <button
                      onClick={() => setShowSaveReminder(false)}
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-all duration-200"
                      aria-label="Dismiss"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Animation keyframes */}
          <style>{`
            @keyframes slideInScale {
              0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
              }
              100% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
              }
            }
          `}</style>
        </>,
        document.body
      )}
    </>
  );
};

export default MobileSettingsView;