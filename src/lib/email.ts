import { store } from '../store'

export interface EmailData {
  to: string
  cc?: string[]
  subject: string
  message: string
  userEmail?: string
  userName?: string
}

/**
 * Send email connecting user with immigration partner
 */
export async function sendImmigrationPartnerEmail(userEmail: string, userName?: string): Promise<boolean> {
  const emailData: EmailData = {
    to: 'rachael@gullie.io',
    cc: ['moves@gullie.io'],
    subject: `New Immigration Client Referral: ${userName || 'Gullie User'}`,
    message: `Hi Rachael,

We have a new client who needs immigration assistance for their relocation.

Client Details:
- Name: ${userName || 'Not provided'}
- Email: ${userEmail}
- From: ${store.relocationPlan?.fromCity || 'Not specified'}
- To: ${store.relocationPlan?.toCity || 'Not specified'}
- Move Date: ${store.relocationPlan?.selectedDate || 'Not specified'}
- Household Size: ${store.relocationPlan?.householdSize || 'Not specified'}
- Current Visa Status: ${store.relocationPlan?.visaStatus || 'Assessment needed'}

The client has expressed interest in immigration services through our Gullie platform. They are looking for assistance with visa applications, documentation, and the immigration process.

Please coordinate connecting them with Aizada from Alma at aizada@tryalma.com or reach out to them directly at ${userEmail} to schedule a consultation.

Best regards,
Gullie Platform

---
This referral was generated automatically through the Gullie relocation platform.`,
    userEmail,
    userName
  }

  try {
    // For now, simulate email sending - in production, integrate with your email service
    console.log('Sending immigration partner email:', emailData)
    
    // In production, replace with actual email service call:
    // const response = await fetch('/api/send-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(emailData)
    // })
    // return response.ok
    
    // Simulate successful email send
    return true
  } catch (error) {
    console.error('Failed to send immigration partner email:', error)
    return false
  }
}

/**
 * Collect user email if not already available
 */
export function ensureUserEmail(): Promise<string | null> {
  return new Promise((resolve) => {
    // Check if we already have user email
    if (store.relocationPlan?.userEmail) {
      resolve(store.relocationPlan.userEmail)
      return
    }

    // Prompt for email
    const email = prompt('To connect you with our immigration specialist, please provide your email address:')
    if (email && email.includes('@')) {
      // Store email in relocation plan
      const currentPlan = store.relocationPlan || {
        fromCity: '',
        toCity: ''
      }
      store.relocationPlan = {
        ...currentPlan,
        userEmail: email
      }
      resolve(email)
    } else {
      resolve(null)
    }
  })
}

/**
 * Collect user name if not already available
 */
export function ensureUserName(): Promise<string | null> {
  return new Promise((resolve) => {
    // Check if we already have user name
    if (store.relocationPlan?.userName) {
      resolve(store.relocationPlan.userName)
      return
    }

    // Prompt for name
    const name = prompt('Please provide your name for the introduction:')
    if (name && name.trim()) {
      // Store name in relocation plan
      const currentPlan = store.relocationPlan || {
        fromCity: '',
        toCity: ''
      }
      store.relocationPlan = {
        ...currentPlan,
        userName: name.trim()
      }
      resolve(name.trim())
    } else {
      resolve(null)
    }
  })
}