import { gullieSay } from '../store'
import type { ServiceType } from '../types'

export async function startServiceWorkflow(service: ServiceType, threadId: string) {
  switch (service) {
    case 'pets':
      startPetRelocationWorkflow(threadId)
      break
    case 'shipping':
      startShippingWorkflow(threadId)
      break
    case 'immigration':
      startImmigrationWorkflow(threadId)
      break
    case 'housing':
      startHousingWorkflow(threadId)
      break
    case 'accommodation':
      startAccommodationWorkflow(threadId)
      break
    case 'finance':
      startFinanceWorkflow(threadId)
      break
    case 'healthcare':
      startHealthcareWorkflow(threadId)
      break
    case 'transportation':
      startTransportationWorkflow(threadId)
      break
    case 'education':
      startEducationWorkflow(threadId)
      break
    case 'utilities':
      startUtilitiesWorkflow(threadId)
      break
    case 'insurance':
      startInsuranceWorkflow(threadId)
      break
    case 'lifestyle':
      startLifestyleWorkflow(threadId)
      break
    default:
      // For general or unknown services, start with basic welcome
      gullieSay("Welcome! How can I help you with your relocation?", threadId)
  }
}

function startPetRelocationWorkflow(threadId: string) {
  // Agent prompts first with conversational greeting
  gullieSay("Hi there! I'd love to help you relocate your furry (or feathered) family members safely. 🐾", threadId)
  
  // Then follow up with the assessment
  setTimeout(() => {
    const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">🐾 Pet Relocation Assessment</h3>
  <p style="margin:0 0 16px 0;font:14px 'Cera Pro',sans-serif;color:#6b7280">I'll help you relocate your pets safely and legally. Let's start with some basic information:</p>
  
  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#92400e">What pets are you relocating?</h4>
    
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr;margin-bottom:12px">
      <button data-intent="set_pet_type" data-payload='{"type":"dog","details":"Dog relocation"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🐕 Dogs</button>
      <button data-intent="set_pet_type" data-payload='{"type":"cat","details":"Cat relocation"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🐱 Cats</button>
      <button data-intent="set_pet_type" data-payload='{"type":"bird","details":"Bird relocation"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🐦 Birds</button>
      <button data-intent="set_pet_type" data-payload='{"type":"exotic","details":"Exotic pet relocation"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🦎 Exotic pets</button>
    </div>
    
    <button data-intent="pet_details_form" data-payload='{"action":"detailed_form"}' style="width:100%;padding:12px;border:1px solid #7c3aed;background:#7c3aed;color:#fff;border-radius:6px;font:14px 'Cera Pro',sans-serif">📋 Fill Detailed Pet Info Form</button>
  </div>

  <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#065f46">🌍 International Pet Travel Requirements:</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#065f46;line-height:1.5">
      • <strong>Health certificates</strong> & vaccinations<br/>
      • <strong>Quarantine requirements</strong> (varies by country)<br/>
      • <strong>Import permits</strong> & customs documentation<br/>
      • <strong>CITES permits</strong> (for exotic species)<br/>
      • <strong>Approved transport carriers</strong> & flight arrangements
    </div>
  </div>
</div>`
    gullieSay(html, threadId)
  }, 1000)
}

function startShippingWorkflow(threadId: string) {
  // Agent prompts first with conversational greeting
  gullieSay("Hello! I'm here to help you ship your belongings safely and affordably to your new home. 📦", threadId)
  
  // Ask ONLY the first question - household size
  setTimeout(() => {
    askHouseholdSizeQuestion(threadId)
  }, 1000)
}

// Step 1: Ask household size only
function askHouseholdSizeQuestion(threadId: string) {
  const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">📦 Shipping Assessment</h3>
  <p style="margin:0 0 16px 0;font:14px 'Cera Pro',sans-serif;color:#6b7280">Let's start by understanding the size of your current living space to estimate shipping volume.</p>
  
  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#92400e">What's your current household size?</h4>
    
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr 1fr;margin-bottom:12px">
      <button data-intent="set_household_goods" data-payload='{"size":"studio","description":"Studio apartment (1-2 rooms)","step":"size_selected"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🏠 Studio</button>
      <button data-intent="set_household_goods" data-payload='{"size":"1br","description":"1-bedroom apartment","step":"size_selected"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🏠 1-Bedroom</button>
      <button data-intent="set_household_goods" data-payload='{"size":"2br","description":"2-bedroom apartment","step":"size_selected"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🏠 2-Bedroom</button>
    </div>
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr 1fr">
      <button data-intent="set_household_goods" data-payload='{"size":"3br","description":"3-bedroom house","step":"size_selected"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🏡 3-Bedroom</button>
      <button data-intent="set_household_goods" data-payload='{"size":"4br","description":"4+ bedroom house","step":"size_selected"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🏡 4+ Bedrooms</button>
      <button data-intent="household_survey" data-payload='{"action":"virtual_survey","step":"survey_selected"}' style="padding:10px;border:1px solid #7c3aed;background:#7c3aed;color:#fff;border-radius:6px;font:12px 'Cera Pro',sans-serif">📊 Virtual Survey</button>
    </div>
  </div>
</div>`
  gullieSay(html, threadId)
}

// Step 2: Ask shipping type only (called after household size is selected)
export function askShippingTypeQuestion(threadId: string, householdSize: string) {
  const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">📦 What Are You Shipping?</h3>
  <p style="margin:0 0 16px 0;font:14px 'Cera Pro',sans-serif;color:#6b7280">Great! You selected ${householdSize}. Now, what type of items do you plan to ship?</p>
  
  <div style="background:#e0f2fe;border:1px solid #0ea5e9;border-radius:8px;padding:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#0c4a6e">Choose your shipping category:</h4>
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr">
      <button data-intent="shipping_type" data-payload='{"type":"full_household","description":"Complete household","step":"type_selected"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">📦 Everything</button>
      <button data-intent="shipping_type" data-payload='{"type":"essentials_only","description":"Essentials only","step":"type_selected"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">⭐ Essentials only</button>
      <button data-intent="shipping_type" data-payload='{"type":"furniture_only","description":"Furniture only","step":"type_selected"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🛋️ Furniture only</button>
      <button data-intent="shipping_type" data-payload='{"type":"documents_valuables","description":"Documents & valuables","step":"type_selected"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">📄 Docs & valuables</button>
    </div>
  </div>
</div>`
  gullieSay(html, threadId)
}

function startImmigrationWorkflow(threadId: string) {
  // Agent prompts first with conversational greeting
  gullieSay("Hello! I'm here to help you with your immigration and visa needs. 📋", threadId)
  
  // Then follow up with the interactive assessment
  setTimeout(() => {
    const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <p style="margin:0 0 16px 0;font:14px 'Cera Pro',sans-serif;color:#6b7280">I can help you navigate visa requirements, connect you with immigration lawyers, and guide you through the application process. Let me understand your situation:</p>
  
  <div style="background:#e0f2fe;border:1px solid #0ea5e9;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#0c4a6e">What type of visa or immigration assistance do you need?</h4>
    
    <div style="display:grid;gap:8px;margin-bottom:12px">
      <button data-intent="visa_status" data-payload='{"status":"need_work_visa","details":"Require work visa/permit"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">💼 Work visa/permit</button>
      <button data-intent="visa_status" data-payload='{"status":"family_visa","details":"Family reunification visa"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">👨‍👩‍👧‍👦 Family reunification</button>
      <button data-intent="visa_status" data-payload='{"status":"student_visa","details":"Student visa application"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🎓 Student visa</button>
      <button data-intent="visa_status" data-payload='{"status":"investment_visa","details":"Investment/entrepreneur visa"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">💰 Investment/entrepreneur</button>
      <button data-intent="visa_status" data-payload='{"status":"have_visa","details":"Already have valid visa"}' style="padding:10px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">✅ Already have valid visa</button>
      <button data-intent="visa_status" data-payload='{"status":"citizenship","details":"Citizenship/permanent residency"}' style="padding:10px;border:1px solid #7c3aed;background:#f3e8ff;color:#581c87;border-radius:6px;font:12px 'Cera Pro',sans-serif;text-align:left">🏛️ Citizenship/permanent residency</button>
    </div>
    
    <div style="border-top:1px solid #cbd5e1;margin-top:12px;padding-top:12px">
      <p style="margin:0 0 8px 0;font:12px 'Cera Pro',sans-serif;color:#64748b">Or tell me about your specific situation:</p>
      <button data-intent="immigration_consultation" data-payload='{"action":"schedule_consultation"}' style="width:100%;padding:12px;border:1px solid #3b82f6;background:#3b82f6;color:#fff;border-radius:6px;font:14px 'Cera Pro',sans-serif">📞 Schedule Expert Consultation</button>
    </div>
  </div>

  <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#92400e">💡 What I can help with:</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#92400e;line-height:1.5">
      • <strong>Requirements research</strong> for your specific country/visa type<br/>
      • <strong>Document checklist</strong> & timeline planning<br/>
      • <strong>Immigration lawyer connections</strong> in your destination<br/>
      • <strong>Application tracking</strong> & status updates<br/>
      • <strong>Interview preparation</strong> & tips
    </div>
  </div>
</div>`
    gullieSay(html, threadId)
  }, 1000)
}

function startHousingWorkflow(threadId: string) {
  // Agent prompts first with conversational greeting
  gullieSay("Hi! I'm excited to help you find the perfect home in your new city. 🏡", threadId)
  
  // Then follow up with the assessment
  setTimeout(() => {
    const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">🏡 Housing Search</h3>
  <p style="margin:0 0 16px 0;font:14px 'Cera Pro',sans-serif;color:#6b7280">I'll help you find the perfect home in your new city. Let's start with your preferences:</p>
  
  <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:16px;margin-bottom:16px">
    <h4 style="margin:0 0 12px 0;font:600 13px 'Cera Pro',sans-serif;color:#065f46">What type of housing do you prefer?</h4>
    
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr;margin-bottom:12px">
      <button data-intent="housing_type" data-payload='{"type":"rent","preference":"Rental apartment/house"}' style="padding:10px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:12px 'Cera Pro',sans-serif">🏠 Rent</button>
      <button data-intent="housing_type" data-payload='{"type":"buy","preference":"Purchase property"}' style="padding:10px;border:1px solid #10b981;background:#ecfdf5;color:#065f46;border-radius:6px;font:12px 'Cera Pro',sans-serif">🏡 Buy</button>
      <button data-intent="housing_type" data-payload='{"type":"temporary","preference":"Short-term/furnished"}' style="padding:10px;border:1px solid #f59e0b;background:#fef3c7;color:#92400e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🏨 Short-term</button>
      <button data-intent="housing_type" data-payload='{"type":"corporate","preference":"Corporate housing"}' style="padding:10px;border:1px solid #0ea5e9;background:#e0f2fe;color:#0c4a6e;border-radius:6px;font:12px 'Cera Pro',sans-serif">🏢 Corporate</button>
    </div>
    
    <button data-intent="housing_preferences" data-payload='{"action":"detailed_preferences"}' style="width:100%;padding:12px;border:1px solid #10b981;background:#10b981;color:#fff;border-radius:6px;font:14px 'Cera Pro',sans-serif">📝 Set Detailed Preferences</button>
  </div>

  <div style="background:#e0f2fe;border:1px solid #0ea5e9;border-radius:8px;padding:12px">
    <h4 style="margin:0 0 8px 0;font:600 13px 'Cera Pro',sans-serif;color:#0c4a6e">🎯 What I'll help you with:</h4>
    <div style="font:12px 'Cera Pro',sans-serif;color:#0c4a6e;line-height:1.5">
      • <strong>Local real estate agent</strong> connections<br/>
      • <strong>Neighborhood research</strong> & area recommendations<br/>
      • <strong>Legal requirements</strong> for international buyers/renters<br/>
      • <strong>Mortgage/financing options</strong> for foreign nationals<br/>
      • <strong>Property viewing coordination</strong> & virtual tours
    </div>
  </div>
</div>`
    gullieSay(html, threadId)
  }, 1000)
}

// Add more workflow functions for other services...
function startAccommodationWorkflow(threadId: string) {
  gullieSay("🏨 Let's find you temporary accommodation for your arrival. What dates do you need housing, and do you prefer hotels, serviced apartments, or extended stay options?", threadId)
}

function startFinanceWorkflow(threadId: string) {
  gullieSay("💰 I'll help you set up banking and financial services in your new country. Do you need to open a bank account, transfer funds internationally, or understand tax obligations?", threadId)
}

function startHealthcareWorkflow(threadId: string) {
  gullieSay("🏥 Let's get your healthcare sorted in your new location. Are you looking for health insurance, finding doctors, or transferring medical records?", threadId)
}

function startTransportationWorkflow(threadId: string) {
  gullieSay("🚗 I'll help with transportation options in your new city. Do you need to get a local driver's license, buy/lease a car, or learn about public transportation?", threadId)
}

function startEducationWorkflow(threadId: string) {
  gullieSay("🎓 Let's get your children's education sorted. What ages are your children, and are you looking for public schools, private schools, or international schools?", threadId)
}

function startUtilitiesWorkflow(threadId: string) {
  gullieSay("⚡ I'll help you set up essential services in your new home. Do you need electricity, gas, water, internet, or other utility connections?", threadId)
}

function startInsuranceWorkflow(threadId: string) {
  gullieSay("🛡️ Let's protect you with the right insurance coverage. Are you looking for health, home, auto, or life insurance in your new country?", threadId)
}

function startLifestyleWorkflow(threadId: string) {
  gullieSay("🌟 I'll help you integrate into your new community. Are you interested in local culture, language learning, social groups, or recreational activities?", threadId)
}
