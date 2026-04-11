import { supabase } from '../lib/supabaseClient.js';
import { log } from '../modules/utils/logger.js';

let activeApplicationId = null;

export const setApplicationId = (id) => {
  activeApplicationId = id;
};

export const getApplicationId = () => activeApplicationId;

export const initLoanApplication = async (metadata = {}) => {
  try {
    // Session expires in 48 hours
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('loan_applications')
      .insert([{
        user_id: metadata.user_id || null,
        status: 'pending_kyc',
        resume_checkpoint: 'chat_started',
        expires_at: expiresAt,
        ip_address: metadata.ip_address,
        latitude: metadata.latitude,
        longitude: metadata.longitude,
        device_fingerprint: metadata.device_fingerprint,
        user_agent: metadata.user_agent
      }])
      .select()
      .single();

    if (error) throw error;

    activeApplicationId = data.id;
    log('DB', 'INFO', `Initialized new loan application: ${activeApplicationId}`);
    return data; // Return full data object
  } catch (err) {
    log('DB', 'ERROR', 'Failed to init loan application', err);
    return null;
  }
};

/**
 * Velocity Check: Returns the count of applications from the same device 
 * in the last 24 hours.
 */
export const getFingerprintVelocity = async (fingerprint) => {
  if (!fingerprint) return 0;
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from('loan_applications')
      .select('*', { count: 'exact', head: true })
      .eq('device_fingerprint', fingerprint)
      .gt('created_at', yesterday);

    if (error) throw error;
    return count || 0;
  } catch (err) {
    log('DB', 'ERROR', 'Failed to fetch velocity count', err);
    return 0;
  }
};

/**
 * Persists the fraud assessment to the database.
 */
export const saveFraudReport = async (riskScore, signals) => {
  if (!activeApplicationId) return;
  try {
    const { error } = await supabase
      .from('loan_applications')
      .update({
        fraud_risk_score: riskScore,
        fraud_signals: signals
      })
      .eq('id', activeApplicationId);

    if (error) throw error;
    log('DB', 'INFO', `Saved fraud report (score: ${riskScore}) for ${activeApplicationId}`);
  } catch (err) {
    log('DB', 'ERROR', 'Failed to save fraud report', err);
  }
};

/**
 * Uploads media (Blob, File, or base64 string) to Supabase Storage
 */
export const uploadMedia = async (folder, fileName, mediaData) => {
  try {
    let finalData = mediaData;
    let contentType = 'image/jpeg'; // Default for base64 frames

    // Handle base64 string
    if (typeof mediaData === 'string' && mediaData.startsWith('data:')) {
      const match = mediaData.match(/^data:([^;]+);base64,/);
      if (match) contentType = match[1];

      const base64Content = mediaData.split(';base64,').pop();
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      finalData = new Blob([byteArray], { type: contentType });
    } else if (mediaData instanceof File || mediaData instanceof Blob) {
      // Use original content type for physical files
      contentType = mediaData.type;
    }

    const filePath = `${activeApplicationId}/${folder}/${fileName}`;
    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, finalData, {
        upsert: true,
        contentType: contentType // Crucial for opening in browser
      });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    log('DB', 'ERROR', `Failed to upload ${folder} media`, err);
    return null;
  }
};

/**
 * Updates application with verbally extracted financial data
 */
export const updateApplicationFinancials = async (extractedData) => {
  if (!activeApplicationId) return;
  try {
    const { error } = await supabase
      .from('loan_applications')
      .update({
        stated_income: parseFloat(extractedData?.income?.value) || null,
        loan_purpose: extractedData?.purpose?.value || null,
        employment_type: extractedData?.employment?.value || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', activeApplicationId);

    if (error) throw error;
    log('DB', 'INFO', 'Updated application financial profile');
  } catch (err) {
    log('DB', 'ERROR', 'Failed to update financials', err);
  }
};

/**
 * @param {Object} extractedData - AI-extracted fields (verbal)
 * @param {Object} faceAgeObj    - Face scan result
 * @param {Object} aadhaarObj    - Parsed Aadhaar QR data
 * @param {Object} mediaUrls     - URLs from Supabase Storage
 */
export const saveKycRecord = async (extractedData, faceAgeObj, aadhaarObj = null, mediaUrls = {}) => {
  if (!activeApplicationId) return;
  try {
    const aadhaarName = aadhaarObj?.name || extractedData?.name?.value || 'Unknown';
    const aadhaarGender = aadhaarObj?.gender || extractedData?.gender?.value || null;

    let aadhaarAge = faceAgeObj?.aadhaarAge || null;
    if (!aadhaarAge && aadhaarObj?.dob) {
      const yearMatch = aadhaarObj.dob.match(/(\d{4})/);
      if (yearMatch) aadhaarAge = new Date().getFullYear() - parseInt(yearMatch[1]);
    }

    const { error } = await supabase.from('kyc_records').insert([{
      application_id: activeApplicationId,
      aadhaar_name: aadhaarName,
      aadhaar_age: aadhaarAge,
      aadhaar_gender: aadhaarGender,
      biometric_age: faceAgeObj?.estimatedAge || null,
      biometric_match_status: faceAgeObj?.status || 'unknown',
      liveness_score: (faceAgeObj?.status && faceAgeObj.status !== 'spoof') ? 1.0 : 0.0,
      aadhaar_image_url: mediaUrls.aadhaar || null,
      face_capture_url: mediaUrls.face || null
    }]);

    if (error) throw error;
    log('DB', 'INFO', `Saved KYC record for ${aadhaarName}`);
  } catch (err) {
    log('DB', 'ERROR', 'Failed to save KYC record', err);
  }
};

export const saveBureauReport = async (bureauData, policyLogs = []) => {
  if (!activeApplicationId) return;
  try {
    const { error } = await supabase.from('bureau_reports').insert([{
      application_id: activeApplicationId,
      credit_score: bureauData?.creditScore || 0,
      active_loans: bureauData?.activeLoans || 0,
      written_off_accounts: bureauData?.writtenOffAccounts || 0,
      credit_utilization: bureauData?.creditUtilization || 0,
      report_data: bureauData,
      policy_reasoning: policyLogs
    }]);

    if (error) throw error;
    log('DB', 'INFO', 'Saved Bureau Report with Policy Reasoning');

    // Update application status
    await supabase.from('loan_applications').update({ status: 'negotiating' }).eq('id', activeApplicationId);
  } catch (err) {
    log('DB', 'ERROR', 'Failed to save Bureau record', err);
  }
};

export const saveLoanOffers = async (alternatives) => {
  if (!activeApplicationId || !alternatives || alternatives.length === 0) {
    log('DB', 'WARN', `saveLoanOffers: skipped — appId=${activeApplicationId}, alts=${alternatives?.length}`);
    return;
  }
  try {
    // Helper to compute EMI
    const calcEMI = (p, annualRate, months) => {
      const r = annualRate / 12 / 100;
      if (r === 0) return Math.round(p / months);
      return Math.round(p * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1));
    };

    const inserts = alternatives.map(alt => {
      const amount = parseFloat(alt.amount) || 0;
      const rate = parseFloat(alt.interestRate || alt.roi) || 0;
      const tenure = parseInt(alt.tenure) || 36;
      const emi = alt.emi ? parseFloat(alt.emi) : calcEMI(amount, rate, tenure);

      return {
        application_id: activeApplicationId,
        offer_tier: alt.title || alt.name || 'Unknown',
        principal_amount: amount,
        roi: rate,
        tenure_months: tenure,
        emi: emi,
        is_selected: false
      };
    });

    log('DB', 'INFO', `saveLoanOffers: inserting ${inserts.length} rows for app ${activeApplicationId}`, inserts);
    const { error } = await supabase.from('loan_offers').insert(inserts);
    if (error) throw error;
    log('DB', 'INFO', `Saved ${alternatives.length} generated loan offers`);
  } catch (err) {
    log('DB', 'ERROR', 'Failed to save loan offers', err);
    console.error('[DB] saveLoanOffers failed:', err);
  }
};

export const saveTranscript = async (role, messageText) => {
  if (!activeApplicationId) return;
  try {
    const { error } = await supabase.from('negotiation_transcripts').insert([{
      application_id: activeApplicationId,
      role: role, // 'user', 'agent', 'system'
      message_text: messageText
    }]);
    if (error) throw error;
  } catch (err) {
    log('DB', 'ERROR', 'Failed to save transcript', err);
  }
};

export const completeApplication = async (status, selectedPlanName = null) => {
  if (!activeApplicationId) return;
  try {
    // If a plan was explicitly selected, we first update that specific offer in the loan_offers table
    let finalOfferId = null;

    if (selectedPlanName) {
      const { data, error } = await supabase
        .from('loan_offers')
        .update({ is_selected: true })
        .eq('application_id', activeApplicationId)
        .eq('offer_tier', selectedPlanName)
        .select()
        .single();

      if (!error && data) {
        finalOfferId = data.id;
      }
    }

    const updateData = { status, updated_at: new Date().toISOString() };
    if (finalOfferId) updateData.final_offer_id = finalOfferId;

    const { error } = await supabase.from('loan_applications').update(updateData).eq('id', activeApplicationId);
    if (error) throw error;

    log('DB', 'INFO', `Application ${activeApplicationId} closed with status: ${status}`);
  } catch (err) {
    log('DB', 'ERROR', 'Failed to complete application', err);
  }
};

/**
 * Tier 5: Persists LLM chain-of-thought intelligence analysis.
 * Stores intent classification + risk persona with full reasoning traces.
 *
 * @param {string} applicationId - The application UUID
 * @param {{ intent: Object, riskPersona: Object }} analysisData
 */
export const saveIntelligenceAnalysis = async (applicationId, analysisData) => {
  if (!applicationId || !analysisData) return;
  try {
    const updatePayload = {};

    if (analysisData.intent) {
      updatePayload.intent_category = analysisData.intent.category;
      updatePayload.intent_confidence = analysisData.intent.confidence;
      updatePayload.intent_reasoning = analysisData.intent.chainOfThought;
    }

    if (analysisData.riskPersona) {
      updatePayload.risk_persona = analysisData.riskPersona.label;
      updatePayload.risk_reasoning = analysisData.riskPersona.chainOfThought;
    }

    const { error } = await supabase
      .from('loan_applications')
      .update(updatePayload)
      .eq('id', applicationId);

    if (error) throw error;
    log('DB', 'INFO', `Saved Tier 5 intelligence analysis for ${applicationId}`);
  } catch (err) {
    log('DB', 'ERROR', 'Failed to save intelligence analysis', err);
  }
};

/**
 * Hydrates state for resuming an application
 */
export const fetchApplicationState = async (appId) => {
  try {
    const { data: appData, error: appError } = await supabase
      .from('loan_applications')
      .select('*')
      .eq('id', appId)
      .single();

    if (appError) throw appError;

    // Check expiry
    if (appData.expires_at && new Date(appData.expires_at) < new Date()) {
      throw new Error('Application resume session has expired (48 hours limit).');
    }

    const { data: kycData } = await supabase
      .from('kyc_records')
      .select('*')
      .eq('application_id', appId)
      .single();

    return { application: appData, kyc: kycData };
  } catch (err) {
    log('DB', 'ERROR', `Failed to fetch state for app ${appId}`, err);
    return null;
  }
};

export const updateResumeCheckpoint = async (appId, checkpoint) => {
  try {
    const { error } = await supabase
      .from('loan_applications')
      .update({ resume_checkpoint: checkpoint, updated_at: new Date().toISOString() })
      .eq('id', appId);
    
    if (error) throw error;
    log('DB', 'INFO', `Updated resume checkpoint to ${checkpoint} for app ${appId}`);
  } catch (err) {
    log('DB', 'ERROR', `Failed to update checkpoint ${checkpoint}`, err);
  }
};

export const lockApplication = async (appId, sessionId) => {
  try {
    const { data, error } = await supabase
      .from('loan_applications')
      .update({ is_active_session: true, active_session_id: sessionId })
      .eq('id', appId)
      .select()
      .single();

    if (error) throw error;
    return true;
  } catch (err) {
    log('DB', 'ERROR', `Failed to lock application ${appId}`, err);
    return false;
  }
};

export const unlockApplication = async (appId) => {
  try {
    const { error } = await supabase
      .from('loan_applications')
      .update({ is_active_session: false, active_session_id: null })
      .eq('id', appId);

    if (error) throw error;
  } catch (err) {
    log('DB', 'ERROR', `Failed to unlock app ${appId}`, err);
  }
};

export const logApplicationEvent = async (appId, eventName, metadata = {}) => {
  try {
    const { error } = await supabase
      .from('application_events')
      .insert([{
        application_id: appId,
        event: eventName,
        metadata: metadata
      }]);
    
    if (error) throw error;
  } catch (err) {
    log('DB', 'WARN', `Could not log application event ${eventName}`, err);
  }
};

