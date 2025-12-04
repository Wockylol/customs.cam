import React, { useState, useMemo } from 'react';
import { Database, Users, Search, ChevronDown, ChevronRight, Edit2, Save, X, Loader2, AlertCircle, CheckCircle, FileText, Upload } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAllClientsData } from '../hooks/useAllClientsData';
import ClientAvatar from '../components/ui/ClientAvatar';

interface EditingData {
  personalInfo: any;
  questionnaire: any;
  preferences: any;
  personas: string[];
  contentDetails: Array<{
    id?: string;
    content_type: string;
    enabled: boolean;
    price_min: number;
    price_max: number;
  }>;
  platformCredentials: Array<{
    id: string;
    platform: string;
    email: string | null;
    password: string | null;
  }>;
}

// CSV Parser utility
const parseCSVRow = (csvText: string): Record<string, string> => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  
  // Handle quoted values with commas
  const parsedValues: string[] = [];
  let currentValue = '';
  let insideQuotes = false;
  
  for (let i = 0; i < lines[1].length; i++) {
    const char = lines[1][i];
    
    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      parsedValues.push(currentValue.trim().replace(/^"|"$/g, ''));
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  // Push the last value
  parsedValues.push(currentValue.trim().replace(/^"|"$/g, ''));

  const result: Record<string, string> = {};
  headers.forEach((header, index) => {
    result[header] = parsedValues[index] || '';
  });

  return result;
};

const ClientDataManagement: React.FC = () => {
  const { clients, loading, error, refetch } = useAllClientsData();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingData | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [csvText, setCSVText] = useState('');

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    
    const term = searchTerm.toLowerCase();
    return clients.filter(client => 
      client.username.toLowerCase().includes(term) ||
      client.personal_info?.email?.toLowerCase().includes(term) ||
      client.personal_info?.legal_name?.toLowerCase().includes(term) ||
      client.questionnaire?.public_name?.toLowerCase().includes(term)
    );
  }, [clients, searchTerm]);

  const toggleExpand = (clientId: string) => {
    if (expandedClient === clientId) {
      setExpandedClient(null);
    } else {
      setExpandedClient(clientId);
    }
  };

  const startEditing = (client: any) => {
    setEditingClient(client.id);
    setEditingData({
      personalInfo: {
        legalName: client.personal_info?.legal_name || '',
        email: client.personal_info?.email || '',
        phone: client.personal_info?.phone || '',
        dateOfBirth: client.personal_info?.date_of_birth || '',
        address: client.personal_info?.address || '',
      },
      questionnaire: {
        publicName: client.questionnaire?.public_name || '',
        publicNicknames: client.questionnaire?.public_nicknames || '',
        publicBirthday: client.questionnaire?.public_birthday || '',
        gender: client.questionnaire?.gender || '',
        nativeLanguage: client.questionnaire?.native_language || '',
        otherLanguages: client.questionnaire?.other_languages || '',
        sexualOrientation: client.questionnaire?.sexual_orientation || '',
        ethnicity: client.questionnaire?.ethnicity || '',
        height: client.questionnaire?.height || '',
        weight: client.questionnaire?.weight || '',
        shoeSize: client.questionnaire?.shoe_size || '',
        braSize: client.questionnaire?.bra_size || '',
        zodiacSign: client.questionnaire?.zodiac_sign || '',
        favoriteColors: client.questionnaire?.favorite_colors || '',
        birthPlace: client.questionnaire?.birth_place || '',
        currentLocation: client.questionnaire?.current_location || '',
        hobbies: client.questionnaire?.hobbies || '',
        college: client.questionnaire?.college || '',
        currentCar: client.questionnaire?.current_car || '',
        dreamCar: client.questionnaire?.dream_car || '',
        pets: client.questionnaire?.pets || '',
        favoritePlaceTraveled: client.questionnaire?.favorite_place_traveled || '',
        dreamDestination: client.questionnaire?.dream_destination || '',
        relationshipStatus: client.questionnaire?.relationship_status || '',
        dreamDate: client.questionnaire?.dream_date || '',
        hasChildren: client.questionnaire?.has_children || '',
        otherCareer: client.questionnaire?.other_career || '',
        knownFrom: client.questionnaire?.known_from || '',
        additionalInfo: client.questionnaire?.additional_info || '',
      },
      preferences: {
        minimumPricing: client.preferences?.minimum_pricing || 0,
        videoCall: client.preferences?.video_call || false,
        audioCall: client.preferences?.audio_call || false,
        dickRates: client.preferences?.dick_rates || false,
        fanSigns: client.preferences?.fan_signs || false,
        usingFansName: client.preferences?.using_fans_name || false,
        sayingSpecificThings: client.preferences?.saying_specific_things || false,
        roleplaying: client.preferences?.roleplaying || false,
        usingToysProps: client.preferences?.using_toys_props || false,
        specificOutfits: client.preferences?.specific_outfits || false,
        fullNudityCensored: client.preferences?.full_nudity_censored || false,
        fullNudityUncensored: client.preferences?.full_nudity_uncensored || false,
        masturbation: client.preferences?.masturbation || false,
        analContent: client.preferences?.anal_content || false,
        feetContent: client.preferences?.feet_content || false,
      },
      personas: client.personas || [],
      contentDetails: client.content_details || [],
      platformCredentials: client.platform_credentials || [],
    });
  };

  const cancelEditing = () => {
    setEditingClient(null);
    setEditingData(null);
    setSaveMessage(null);
    setShowCSVImport(false);
    setCSVText('');
  };

  const handleCSVImport = () => {
    if (!csvText.trim() || !editingData) {
      setSaveMessage({ type: 'error', text: 'Please paste CSV data first' });
      return;
    }

    try {
      const csvData = parseCSVRow(csvText);
      
      // Map CSV columns to questionnaire fields
      const updatedQuestionnaire = {
        ...editingData.questionnaire,
        publicName: csvData.public_name || editingData.questionnaire.publicName,
        publicNicknames: csvData.public_nicknames || editingData.questionnaire.publicNicknames,
        publicBirthday: csvData.public_birthday || editingData.questionnaire.publicBirthday,
        gender: csvData.gender || editingData.questionnaire.gender,
        nativeLanguage: csvData.native_language || editingData.questionnaire.nativeLanguage,
        otherLanguages: csvData.other_languages || editingData.questionnaire.otherLanguages,
        sexualOrientation: csvData.sexual_orientation || editingData.questionnaire.sexualOrientation,
        ethnicity: csvData.ethnicity || editingData.questionnaire.ethnicity,
        height: csvData.height || editingData.questionnaire.height,
        weight: csvData.weight || editingData.questionnaire.weight,
        shoeSize: csvData.shoe_size || editingData.questionnaire.shoeSize,
        braSize: csvData.bra_size || editingData.questionnaire.braSize,
        zodiacSign: csvData.zodiac_sign || editingData.questionnaire.zodiacSign,
        favoriteColors: csvData.favorite_colors || editingData.questionnaire.favoriteColors,
        birthPlace: csvData.birth_place || editingData.questionnaire.birthPlace,
        currentLocation: csvData.current_location || editingData.questionnaire.currentLocation,
        hobbies: csvData.hobbies || editingData.questionnaire.hobbies,
        college: csvData.college || editingData.questionnaire.college,
        currentCar: csvData.current_car || editingData.questionnaire.currentCar,
        dreamCar: csvData.dream_car || editingData.questionnaire.dreamCar,
        pets: csvData.pets || editingData.questionnaire.pets,
        favoritePlaceTraveled: csvData.favorite_place_traveled || editingData.questionnaire.favoritePlaceTraveled,
        dreamDestination: csvData.dream_destination || editingData.questionnaire.dreamDestination,
        relationshipStatus: csvData.relationship_status || editingData.questionnaire.relationshipStatus,
        dreamDate: csvData.dream_date || editingData.questionnaire.dreamDate,
        hasChildren: csvData.has_children || editingData.questionnaire.hasChildren,
        otherCareer: csvData.other_career || editingData.questionnaire.otherCareer,
        knownFrom: csvData.known_from || editingData.questionnaire.knownFrom,
        additionalInfo: csvData.additional_info || editingData.questionnaire.additionalInfo,
      };

      setEditingData({
        ...editingData,
        questionnaire: updatedQuestionnaire,
      });

      setSaveMessage({ type: 'success', text: 'CSV data imported successfully! Review and save.' });
      setShowCSVImport(false);
      setCSVText('');
    } catch (err: any) {
      console.error('Error parsing CSV:', err);
      setSaveMessage({ type: 'error', text: `CSV Import Error: ${err.message}` });
    }
  };

  const saveChanges = async () => {
    if (!editingClient || !editingData) return;

    setSaving(true);
    setSaveMessage(null);

    try {
      // Use supabase directly for saving
      const { supabase } = await import('../lib/supabase');

      // Save personal info
      const { error: personalInfoError } = await supabase.rpc('upsert_client_personal_info', {
        p_client_id: editingClient,
        p_legal_name: editingData.personalInfo.legalName || null,
        p_email: editingData.personalInfo.email || null,
        p_phone: editingData.personalInfo.phone || null,
        p_date_of_birth: editingData.personalInfo.dateOfBirth || null,
        p_address: editingData.personalInfo.address || null,
      });
      if (personalInfoError) throw new Error(personalInfoError.message);

      // Save questionnaire
      const { error: questionnaireError } = await supabase.rpc('upsert_client_questionnaire', {
        p_client_id: editingClient,
        p_questionnaire_data: editingData.questionnaire
      });
      if (questionnaireError) throw new Error(questionnaireError.message);

      // Save preferences (upsert)
      const { error: preferencesError } = await supabase
        .from('client_preferences')
        .upsert({
          client_id: editingClient,
          minimum_pricing: editingData.preferences.minimumPricing || 0,
          video_call: editingData.preferences.videoCall || false,
          audio_call: editingData.preferences.audioCall || false,
          dick_rates: editingData.preferences.dickRates || false,
          fan_signs: editingData.preferences.fanSigns || false,
          using_fans_name: editingData.preferences.usingFansName || false,
          saying_specific_things: editingData.preferences.sayingSpecificThings || false,
          roleplaying: editingData.preferences.roleplaying || false,
          using_toys_props: editingData.preferences.usingToysProps || false,
          specific_outfits: editingData.preferences.specificOutfits || false,
          full_nudity_censored: editingData.preferences.fullNudityCensored || false,
          full_nudity_uncensored: editingData.preferences.fullNudityUncensored || false,
          masturbation: editingData.preferences.masturbation || false,
          anal_content: editingData.preferences.analContent || false,
          feet_content: editingData.preferences.feetContent || false,
        }, { onConflict: 'client_id' });
      if (preferencesError) throw new Error(preferencesError.message);

      // Save personas
      const { error: personasError } = await supabase.rpc('set_client_personas', {
        p_client_id: editingClient,
        p_personas: editingData.personas
      });
      if (personasError) throw new Error(personasError.message);

      // Save content details
      for (const contentDetail of editingData.contentDetails) {
        const { error: contentError } = await supabase.rpc('upsert_client_content_detail', {
          p_client_id: editingClient,
          p_content_type: contentDetail.content_type,
          p_enabled: contentDetail.enabled,
          p_price_min: contentDetail.price_min,
          p_price_max: contentDetail.price_max
        });
        if (contentError) throw new Error(contentError.message);
      }

      setSaveMessage({ type: 'success', text: 'Client data saved successfully!' });
      
      // Refetch data after a short delay
      setTimeout(() => {
        refetch();
        cancelEditing();
      }, 1500);
    } catch (err: any) {
      console.error('Error saving client data:', err);
      setSaveMessage({ type: 'error', text: err.message || 'Failed to save client data' });
    } finally {
      setSaving(false);
    }
  };

  const updateEditingData = (section: keyof EditingData, field: string, value: any) => {
    if (!editingData) return;
    
    // Special case for contentDetails - replace entire array
    if (section === 'contentDetails' && field === '') {
      setEditingData({
        ...editingData,
        contentDetails: value,
      });
      return;
    }
    
    // Special case for platformCredentials - replace entire array
    if (section === 'platformCredentials' && field === '') {
      setEditingData({
        ...editingData,
        platformCredentials: value,
      });
      return;
    }
    
    setEditingData({
      ...editingData,
      [section]: {
        ...editingData[section],
        [field]: value,
      },
    });
  };

  const getCompletionPercentage = (client: any) => {
    let filled = 0;
    let total = 0;

    // Personal info (5 fields)
    if (client.personal_info) {
      const fields = ['legal_name', 'email', 'phone', 'date_of_birth', 'address'];
      fields.forEach(field => {
        total++;
        if (client.personal_info[field]) filled++;
      });
    } else {
      total += 5;
    }

    // Questionnaire (26 main fields)
    if (client.questionnaire) {
      const fields = [
        'public_name', 'public_nicknames', 'public_birthday', 'gender',
        'native_language', 'other_languages', 'sexual_orientation', 'ethnicity',
        'height', 'weight', 'shoe_size', 'bra_size', 'zodiac_sign', 'favorite_colors',
        'birth_place', 'current_location', 'hobbies', 'college', 'current_car', 'dream_car',
        'pets', 'favorite_place_traveled', 'dream_destination', 'relationship_status',
        'dream_date', 'has_children'
      ];
      fields.forEach(field => {
        total++;
        if (client.questionnaire[field]) filled++;
      });
    } else {
      total += 26;
    }

    // Preferences (1 for having any)
    total++;
    if (client.preferences) filled++;

    // Personas (1 for having any)
    total++;
    if (client.personas.length > 0) filled++;

    return Math.round((filled / total) * 100);
  };

  if (loading) {
    return (
      <Layout title="Client Data Management">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading client data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Client Data Management">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">Error loading client data: {error}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Client Data Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Client Data Management</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bulk import and update client information
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <Users className="w-4 h-4 inline mr-1" />
            {filteredClients.length} clients
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by username, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Completion
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredClients.map((client) => (
                  <React.Fragment key={client.id}>
                    {/* Main Row */}
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleExpand(client.id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {expandedClient === client.id ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ClientAvatar client={client} size="sm" />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              @{client.username}
                            </div>
                            {client.personal_info?.legal_name && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {client.personal_info.legal_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {client.personal_info?.email || <span className="text-gray-400">Not set</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {client.personal_info?.phone || <span className="text-gray-400">Not set</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${getCompletionPercentage(client)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {getCompletionPercentage(client)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingClient === client.id ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={saveChanges}
                              disabled={saving}
                              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                            >
                              {saving ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4 mr-1" />
                              )}
                              Save
                            </button>
                            <button
                              onClick={() => setShowCSVImport(!showCSVImport)}
                              disabled={saving}
                              className="inline-flex items-center px-3 py-1 border border-blue-300 dark:border-blue-600 text-sm font-medium rounded-md text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                            >
                              <Upload className="w-4 h-4 mr-1" />
                              CSV
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={saving}
                              className="inline-flex items-center px-3 py-1 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              startEditing(client);
                              setExpandedClient(client.id);
                            }}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <Edit2 className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedClient === client.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-6 bg-gray-50 dark:bg-gray-900">
                          {/* CSV Import Section */}
                          {showCSVImport && editingClient === client.id && (
                            <div className="mb-4 p-4 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    Import CSV Data
                                  </h3>
                                </div>
                                <button
                                  onClick={() => setShowCSVImport(false)}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                Paste your CSV data below (must include header row and one data row). The data will autofill the questionnaire fields.
                              </p>
                              <textarea
                                value={csvText}
                                onChange={(e) => setCSVText(e.target.value)}
                                placeholder="id,client_id,public_name,public_nicknames,public_birthday,gender,native_language..."
                                rows={8}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <div className="flex items-center justify-between mt-3">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Expected format: CSV with headers and data row
                                </span>
                                <button
                                  onClick={handleCSVImport}
                                  disabled={!csvText.trim()}
                                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  Import CSV
                                </button>
                              </div>
                            </div>
                          )}

                          {saveMessage && (
                            <div className={`mb-4 p-3 rounded-md ${
                              saveMessage.type === 'success' 
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                            }`}>
                              <div className="flex items-center">
                                {saveMessage.type === 'success' ? (
                                  <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                                ) : (
                                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                                )}
                                <span className={
                                  saveMessage.type === 'success' 
                                    ? 'text-green-800 dark:text-green-200' 
                                    : 'text-red-800 dark:text-red-200'
                                }>
                                  {saveMessage.text}
                                </span>
                              </div>
                            </div>
                          )}

                          <ClientDataForm
                            client={client}
                            isEditing={editingClient === client.id}
                            editingData={editingData}
                            updateEditingData={updateEditingData}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">No clients found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Try adjusting your search terms.' : 'No clients available yet.'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

// Content types available
const CONTENT_TYPES = [
  'Butt Pictures/Videos',
  'Breast Pictures/Videos',
  'Visible Nipples Pictures/Videos',
  'Girl/Girl Pictures/Videos',
  'Boy/Girl Pictures/Videos',
  'Twerk Videos',
  'Full Nudity Censored',
  'Full Nudity Uncensored',
  'Masturbation Pictures/Videos',
  'Fetish/Kink Content',
  'Feet',
  'Dick Rates',
  'Custom Requests',
];

// Sub-component for the client data form
const ClientDataForm: React.FC<{
  client: any;
  isEditing: boolean;
  editingData: EditingData | null;
  updateEditingData: (section: keyof EditingData, field: string, value: any) => void;
}> = ({ client, isEditing, editingData, updateEditingData }) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'questionnaire' | 'customs' | 'content' | 'platforms'>('personal');

  const renderField = (
    section: keyof EditingData,
    field: string,
    label: string,
    type: 'text' | 'date' | 'number' | 'textarea' | 'checkbox' = 'text',
    value?: any
  ) => {
    const displayValue = isEditing 
      ? editingData?.[section]?.[field] 
      : value;

    if (type === 'checkbox') {
      return (
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={displayValue || false}
            onChange={(e) => isEditing && updateEditingData(section, field, e.target.checked)}
            disabled={!isEditing}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        </label>
      );
    }

    if (type === 'textarea') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
          <textarea
            value={displayValue || ''}
            onChange={(e) => isEditing && updateEditingData(section, field, e.target.value)}
            disabled={!isEditing}
            rows={3}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500"
          />
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
        <input
          type={type}
          value={displayValue || ''}
          onChange={(e) => isEditing && updateEditingData(section, field, type === 'number' ? Number(e.target.value) : e.target.value)}
          disabled={!isEditing}
          className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500"
        />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('personal')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'personal'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Personal Info
          </button>
          <button
            onClick={() => setActiveTab('questionnaire')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'questionnaire'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Questionnaire
          </button>
          <button
            onClick={() => setActiveTab('customs')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'customs'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Customs
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'content'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Content
          </button>
          <button
            onClick={() => setActiveTab('platforms')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'platforms'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Platforms
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeTab === 'personal' && (
          <>
            {renderField('personalInfo', 'legalName', 'Legal Name', 'text', client.personal_info?.legal_name)}
            {renderField('personalInfo', 'email', 'Email', 'text', client.personal_info?.email)}
            {renderField('personalInfo', 'phone', 'Phone', 'text', client.personal_info?.phone)}
            {renderField('personalInfo', 'dateOfBirth', 'Date of Birth', 'date', client.personal_info?.date_of_birth)}
            <div className="md:col-span-2 lg:col-span-3">
              {renderField('personalInfo', 'address', 'Address', 'textarea', client.personal_info?.address)}
            </div>
          </>
        )}

        {activeTab === 'questionnaire' && (
          <>
            {renderField('questionnaire', 'publicName', 'Public Name', 'text', client.questionnaire?.public_name)}
            {renderField('questionnaire', 'publicNicknames', 'Nicknames', 'text', client.questionnaire?.public_nicknames)}
            {renderField('questionnaire', 'publicBirthday', 'Public Birthday', 'date', client.questionnaire?.public_birthday)}
            {renderField('questionnaire', 'gender', 'Gender', 'text', client.questionnaire?.gender)}
            {renderField('questionnaire', 'nativeLanguage', 'Native Language', 'text', client.questionnaire?.native_language)}
            {renderField('questionnaire', 'otherLanguages', 'Other Languages', 'text', client.questionnaire?.other_languages)}
            {renderField('questionnaire', 'sexualOrientation', 'Sexual Orientation', 'text', client.questionnaire?.sexual_orientation)}
            {renderField('questionnaire', 'ethnicity', 'Ethnicity', 'text', client.questionnaire?.ethnicity)}
            {renderField('questionnaire', 'height', 'Height', 'text', client.questionnaire?.height)}
            {renderField('questionnaire', 'weight', 'Weight', 'text', client.questionnaire?.weight)}
            {renderField('questionnaire', 'shoeSize', 'Shoe Size', 'text', client.questionnaire?.shoe_size)}
            {renderField('questionnaire', 'braSize', 'Bra Size', 'text', client.questionnaire?.bra_size)}
            {renderField('questionnaire', 'zodiacSign', 'Zodiac Sign', 'text', client.questionnaire?.zodiac_sign)}
            {renderField('questionnaire', 'favoriteColors', 'Favorite Colors', 'text', client.questionnaire?.favorite_colors)}
            {renderField('questionnaire', 'birthPlace', 'Birth Place', 'text', client.questionnaire?.birth_place)}
            {renderField('questionnaire', 'currentLocation', 'Current Location', 'text', client.questionnaire?.current_location)}
            {renderField('questionnaire', 'hobbies', 'Hobbies', 'text', client.questionnaire?.hobbies)}
            {renderField('questionnaire', 'college', 'College', 'text', client.questionnaire?.college)}
            {renderField('questionnaire', 'currentCar', 'Current Car', 'text', client.questionnaire?.current_car)}
            {renderField('questionnaire', 'dreamCar', 'Dream Car', 'text', client.questionnaire?.dream_car)}
            {renderField('questionnaire', 'pets', 'Pets', 'text', client.questionnaire?.pets)}
            {renderField('questionnaire', 'favoritePlaceTraveled', 'Favorite Place Traveled', 'text', client.questionnaire?.favorite_place_traveled)}
            {renderField('questionnaire', 'dreamDestination', 'Dream Destination', 'text', client.questionnaire?.dream_destination)}
            {renderField('questionnaire', 'relationshipStatus', 'Relationship Status', 'text', client.questionnaire?.relationship_status)}
            {renderField('questionnaire', 'dreamDate', 'Dream Date', 'text', client.questionnaire?.dream_date)}
            {renderField('questionnaire', 'hasChildren', 'Has Children', 'text', client.questionnaire?.has_children)}
            {renderField('questionnaire', 'otherCareer', 'Other Career', 'text', client.questionnaire?.other_career)}
            {renderField('questionnaire', 'knownFrom', 'Known From', 'text', client.questionnaire?.known_from)}
            <div className="md:col-span-2 lg:col-span-3">
              {renderField('questionnaire', 'additionalInfo', 'Additional Info', 'textarea', client.questionnaire?.additional_info)}
            </div>
          </>
        )}

        {activeTab === 'customs' && (
          <>
            {renderField('preferences', 'minimumPricing', 'Minimum Pricing ($)', 'number', client.preferences?.minimum_pricing)}
            {renderField('preferences', 'videoCall', 'Video Call', 'checkbox', client.preferences?.video_call)}
            {renderField('preferences', 'audioCall', 'Audio Call', 'checkbox', client.preferences?.audio_call)}
            {renderField('preferences', 'dickRates', 'Dick Rates', 'checkbox', client.preferences?.dick_rates)}
            {renderField('preferences', 'fanSigns', 'Fan Signs', 'checkbox', client.preferences?.fan_signs)}
            {renderField('preferences', 'usingFansName', 'Using Fans Name', 'checkbox', client.preferences?.using_fans_name)}
            {renderField('preferences', 'sayingSpecificThings', 'Saying Specific Things', 'checkbox', client.preferences?.saying_specific_things)}
            {renderField('preferences', 'roleplaying', 'Roleplaying', 'checkbox', client.preferences?.roleplaying)}
            {renderField('preferences', 'usingToysProps', 'Using Toys/Props', 'checkbox', client.preferences?.using_toys_props)}
            {renderField('preferences', 'specificOutfits', 'Specific Outfits', 'checkbox', client.preferences?.specific_outfits)}
            {renderField('preferences', 'fullNudityCensored', 'Full Nudity (Censored)', 'checkbox', client.preferences?.full_nudity_censored)}
            {renderField('preferences', 'fullNudityUncensored', 'Full Nudity (Uncensored)', 'checkbox', client.preferences?.full_nudity_uncensored)}
            {renderField('preferences', 'masturbation', 'Masturbation', 'checkbox', client.preferences?.masturbation)}
            {renderField('preferences', 'analContent', 'Anal Content', 'checkbox', client.preferences?.anal_content)}
            {renderField('preferences', 'feetContent', 'Feet Content', 'checkbox', client.preferences?.feet_content)}
          </>
        )}

        {activeTab === 'content' && (
          <div className="md:col-span-2 lg:col-span-3 space-y-4">
            {CONTENT_TYPES.map((contentType) => {
              const existingDetail = isEditing 
                ? editingData?.contentDetails?.find(cd => cd.content_type === contentType)
                : client.content_details?.find((cd: any) => cd.content_type === contentType);

              return (
                <ContentDetailRow
                  key={contentType}
                  contentType={contentType}
                  contentDetail={existingDetail}
                  isEditing={isEditing}
                  onChange={(detail) => {
                    if (!isEditing || !editingData) return;
                    
                    const newContentDetails = editingData.contentDetails.filter(
                      cd => cd.content_type !== contentType
                    );
                    newContentDetails.push(detail);
                    
                    updateEditingData('contentDetails', '', newContentDetails);
                  }}
                />
              );
            })}
          </div>
        )}

        {activeTab === 'platforms' && (
          <div className="md:col-span-2 lg:col-span-3 space-y-4">
            {(isEditing ? editingData?.platformCredentials : client.platform_credentials)?.length === 0 && (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">No platform credentials available</p>
              </div>
            )}
            {(isEditing ? editingData?.platformCredentials : client.platform_credentials)?.map((credential: any) => (
              <div key={credential.id} className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Platform
                    </label>
                    <input
                      type="text"
                      value={credential.platform || ''}
                      disabled
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email / Username
                    </label>
                    <input
                      type="text"
                      value={credential.email || ''}
                      disabled
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      type="text"
                      value={credential.password || ''}
                      disabled
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Content detail row component
const ContentDetailRow: React.FC<{
  contentType: string;
  contentDetail?: any;
  isEditing: boolean;
  onChange: (detail: any) => void;
}> = ({ contentType, contentDetail, isEditing, onChange }) => {
  const enabled = contentDetail?.enabled || false;
  const priceMin = contentDetail?.price_min || 0;
  const priceMax = contentDetail?.price_max || 0;

  return (
    <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex-1">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              if (isEditing) {
                onChange({
                  content_type: contentType,
                  enabled: e.target.checked,
                  price_min: priceMin,
                  price_max: priceMax,
                });
              }
            }}
            disabled={!isEditing}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white">{contentType}</span>
        </label>
      </div>
      
      <div className="flex items-center gap-2">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Min Price ($)</label>
          <input
            type="number"
            value={priceMin}
            onChange={(e) => {
              if (isEditing) {
                onChange({
                  content_type: contentType,
                  enabled: enabled,
                  price_min: Number(e.target.value),
                  price_max: priceMax,
                });
              }
            }}
            disabled={!isEditing || !enabled}
            className="w-24 px-2 py-1 text-sm rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500"
            min="0"
            step="0.01"
          />
        </div>
        
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Max Price ($)</label>
          <input
            type="number"
            value={priceMax}
            onChange={(e) => {
              if (isEditing) {
                onChange({
                  content_type: contentType,
                  enabled: enabled,
                  price_min: priceMin,
                  price_max: Number(e.target.value),
                });
              }
            }}
            disabled={!isEditing || !enabled}
            className="w-24 px-2 py-1 text-sm rounded-md border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500"
            min="0"
            step="0.01"
          />
        </div>
      </div>
    </div>
  );
};

export default ClientDataManagement;

