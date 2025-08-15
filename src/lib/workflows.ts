import { gullieSay } from '../store'

export async function handleMovingQuotes(_payload: any) {
  const html = `
<div style="padding:16px;background:#fff;max-width:100%;font-family:'Cera Pro',sans-serif">
  <h3 style="margin:0 0 12px 0;font:600 16px 'Cera Pro',sans-serif;color:#1f2937">🚚 Moving Company Quotes</h3>
  
  <div style="display:grid;gap:12px;grid-template-columns:1fr 1fr">
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px">
      <div style="font:600 14px system-ui">Atlas Van Lines</div>
      <div style="font:12px system-ui;color:#6b7280;margin:4px 0">⭐ 4.8 • Full service • Insurance included</div>
      <div style="font:600 16px system-ui;color:#ea580c;margin:8px 0">$4,200 - $6,800</div>
      <button data-intent="select_mover" data-payload='{"company":"Atlas Van Lines","price":"4200-6800","features":["full_service","insurance"]}' style="padding:6px 12px;border:1px solid #ea580c;background:#ea580c;color:#fff;border-radius:6px;font:12px system-ui;width:100%">Select Atlas</button>
    </div>
    
    <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px">
      <div style="font:600 14px system-ui">Crown Relocations</div>
      <div style="font:12px system-ui;color:#6b7280;margin:4px 0">⭐ 4.6 • International specialist • 90 countries</div>
      <div style="font:600 16px system-ui;color:#ea580c;margin:8px 0">$5,500 - $8,200</div>
      <button data-intent="select_mover" data-payload='{"company":"Crown Relocations","price":"5500-8200","features":["international","premium"]}' style="padding:6px 12px;border:1px solid #ea580c;background:#ea580c;color:#fff;border-radius:6px;font:12px system-ui;width:100%">Select Crown</button>
    </div>
  </div>

  <div style="margin-top:16px;background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:12px">
    <div style="font:600 13px system-ui;color:#92400e;margin-bottom:6px">💰 Cost Breakdown</div>
    <div style="font:12px system-ui;color:#92400e">• Packing: $800-1,200 • Shipping: $2,800-4,500 • Insurance: $300-600 • Customs: $200-500</div>
  </div>

  <div style="margin-top:12px">
    <button data-intent="get_custom_quote" data-payload='{"service":"moving"}' style="padding:8px 16px;border:1px solid #6b7280;background:#f9fafb;color:#374151;border-radius:6px;font:12px system-ui">Get Custom Quote</button>
    <button data-intent="start_inventory" data-payload='{"service":"shipping","step":"inventory"}' style="margin-left:8px;padding:8px 16px;border:1px solid #ea580c;background:#ea580c;color:#fff;border-radius:6px;font:12px system-ui">Next: Inventory</button>
  </div>
</div>`
  gullieSay(html)
}

export async function handleInventoryWorkflow() {
  const html = `
<div style="padding:16px;background:#fff;max-width:100%">
  <h3 style="margin:0 0 12px 0;font:600 16px system-ui;color:#1f2937">📋 Inventory Management</h3>
  
  <div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:12px;margin-bottom:16px">
    <h4 style="margin:0 0 8px 0;font:600 13px system-ui;color:#065f46">Room-by-Room Checklist</h4>
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr">
      <button data-intent="inventory_room" data-payload='{"room":"living_room"}' style="padding:8px 12px;border:1px solid #10b981;background:#f0fdf4;color:#065f46;border-radius:6px;font:12px system-ui">🛋️ Living Room</button>
      <button data-intent="inventory_room" data-payload='{"room":"bedroom"}' style="padding:8px 12px;border:1px solid #10b981;background:#f0fdf4;color:#065f46;border-radius:6px;font:12px system-ui">🛏️ Bedroom</button>
      <button data-intent="inventory_room" data-payload='{"room":"kitchen"}' style="padding:8px 12px;border:1px solid #10b981;background:#f0fdf4;color:#065f46;border-radius:6px;font:12px system-ui">🍽️ Kitchen</button>
      <button data-intent="inventory_room" data-payload='{"room":"office"}' style="padding:8px 12px;border:1px solid #10b981;background:#f0fdf4;color:#065f46;border-radius:6px;font:12px system-ui">💻 Office</button>
    </div>
  </div>

  <div style="background:#fef2f2;border:1px solid #ef4444;border-radius:8px;padding:12px;margin-bottom:16px">
    <h4 style="margin:0 0 8px 0;font:600 13px system-ui;color:#991b1b">⚠️ Special Items</h4>
    <p style="margin:0 0 8px 0;font:12px system-ui;color:#7f1d1d">High-value, fragile, or restricted items need special handling</p>
    <button data-intent="special_items" data-payload='{"category":"valuable"}' style="padding:6px 12px;border:1px solid #ef4444;background:#fef2f2;color:#991b1b;border-radius:6px;font:12px system-ui">💎 Valuables</button>
    <button data-intent="special_items" data-payload='{"category":"electronics"}' style="margin-left:8px;padding:6px 12px;border:1px solid #ef4444;background:#fef2f2;color:#991b1b;border-radius:6px;font:12px system-ui">📱 Electronics</button>
  </div>

  <div style="display:grid;gap:12px;grid-template-columns:1fr 1fr">
    <button data-intent="photo_inventory" data-payload='{"action":"start"}' style="padding:12px;border:1px solid #ea580c;background:#ea580c;color:#fff;border-radius:6px;font:13px system-ui">📸 Photo Inventory</button>
    <button data-intent="export_inventory" data-payload='{"format":"pdf"}' style="padding:12px;border:1px solid #6b7280;background:#f9fafb;color:#374151;border-radius:6px;font:13px system-ui">📄 Export List</button>
  </div>
</div>`
  gullieSay(html)
}

export async function handleImmigrationWorkflow() {
  gullieSay('')
  const html = `
<div style="padding:16px;background:#fff;max-width:100%">
  <h3 style="margin:0 0 12px 0;font:600 16px system-ui;color:#1f2937">🛂 Immigration & Visa</h3>
  
  <div style="background:#eff6ff;border:1px solid #3b82f6;border-radius:8px;padding:12px;margin-bottom:16px">
    <h4 style="margin:0 0 8px 0;font:600 13px system-ui;color:#1e40af">UK Visa Requirements</h4>
    <p style="margin:0 0 8px 0;font:12px system-ui;color:#1e3a8a">US citizens need visa for stays over 6 months or work</p>
    <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr">
      <button data-intent="visa_type" data-payload='{"type":"work","category":"skilled_worker"}' style="padding:8px 12px;border:1px solid #3b82f6;background:#dbeafe;color:#1e40af;border-radius:6px;font:12px system-ui">💼 Work Visa</button>
      <button data-intent="visa_type" data-payload='{"type":"family","category":"spouse"}' style="padding:8px 12px;border:1px solid #3b82f6;background:#dbeafe;color:#1e40af;border-radius:6px;font:12px system-ui">👥 Family Visa</button>
      <button data-intent="visa_type" data-payload='{"type":"investment","category":"investor"}' style="padding:8px 12px;border:1px solid #3b82f6;background:#dbeafe;color:#1e40af;border-radius:6px;font:12px system-ui">💰 Investor Visa</button>
      <button data-intent="visa_type" data-payload='{"type":"student","category":"tier4"}' style="padding:8px 12px;border:1px solid #3b82f6;background:#dbeafe;color:#1e40af;border-radius:6px;font:12px system-ui">🎓 Student Visa</button>
    </div>
  </div>

  <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:16px">
    <h4 style="margin:0 0 8px 0;font:600 13px system-ui">📋 Document Checklist</h4>
    <div style="font:12px system-ui;color:#6b7280;line-height:1.5">
      ✅ Valid passport (6+ months)<br/>
      ✅ Visa application form<br/>
      ⏳ Financial statements<br/>
      ⏳ Employment letter<br/>
      ⏳ Biometric appointment
    </div>
    <button data-intent="document_help" data-payload='{"service":"visa_docs"}' style="margin-top:8px;padding:6px 12px;border:1px solid #ea580c;background:#ea580c;color:#fff;border-radius:6px;font:12px system-ui">Get Document Help</button>
  </div>

  <div style="display:grid;gap:8px;grid-template-columns:1fr 1fr">
    <button data-intent="find_solicitor" data-payload='{"speciality":"immigration","location":"london"}' style="padding:10px;border:1px solid #ea580c;background:#ea580c;color:#fff;border-radius:6px;font:12px system-ui">⚖️ Find Solicitor</button>
    <button data-intent="track_application" data-payload='{"service":"visa_tracking"}' style="padding:10px;border:1px solid #6b7280;background:#f9fafb;color:#374151;border-radius:6px;font:12px system-ui">📍 Track Application</button>
  </div>
</div>`
  gullieSay(html)
}

export async function handleAllServicesOverview() {
  gullieSay('')
  const html = `
<div style="padding:16px;background:#fff;max-width:100%">
  <h3 style="margin:0 0 16px 0;font:600 18px system-ui;color:#1f2937">🏠 Complete Relocation Services</h3>
  
  <div style="display:grid;gap:12px;grid-template-columns:1fr 1fr 1fr">
    <button data-intent="service_workflow" data-payload='{"service":"immigration"}' style="padding:12px;border:1px solid #3b82f6;background:#eff6ff;color:#1e40af;border-radius:8px;font:12px system-ui;text-align:left">
      <div style="font:600 13px system-ui">🛂 Immigration</div>
      <div style="font:11px system-ui;opacity:0.8">Visa, docs, legal</div>
    </button>
    
    <button data-intent="service_workflow" data-payload='{"service":"shipping"}' style="padding:12px;border:1px solid #ea580c;background:#fff7ed;color:#c2410c;border-radius:8px;font:12px system-ui;text-align:left">
      <div style="font:600 13px system-ui">📦 Shipping</div>
      <div style="font:11px system-ui;opacity:0.8">Movers, storage</div>
    </button>
    
    <button data-intent="service_workflow" data-payload='{"service":"housing"}' style="padding:12px;border:1px solid #10b981;background:#ecfdf5;color:#047857;border-radius:8px;font:12px system-ui;text-align:left">
      <div style="font:600 13px system-ui">🏡 Housing</div>
      <div style="font:11px system-ui;opacity:0.8">Find, rent, buy</div>
    </button>
    
    <button data-intent="service_workflow" data-payload='{"service":"finance"}' style="padding:12px;border:1px solid #8b5cf6;background:#f5f3ff;color:#7c3aed;border-radius:8px;font:12px system-ui;text-align:left">
      <div style="font:600 13px system-ui">💳 Finance</div>
      <div style="font:11px system-ui;opacity:0.8">Banking, tax, insurance</div>
    </button>
    
    <button data-intent="service_workflow" data-payload='{"service":"healthcare"}' style="padding:12px;border:1px solid #ef4444;background:#fef2f2;color:#dc2626;border-radius:8px;font:12px system-ui;text-align:left">
      <div style="font:600 13px system-ui">🏥 Healthcare</div>
      <div style="font:11px system-ui;opacity:0.8">NHS, doctors, insurance</div>
    </button>
    
    <button data-intent="service_workflow" data-payload='{"service":"transport"}' style="padding:12px;border:1px solid #f59e0b;background:#fef3c7;color:#d97706;border-radius:8px;font:12px system-ui;text-align:left">
      <div style="font:600 13px system-ui">🚗 Transport</div>
      <div style="font:11px system-ui;opacity:0.8">License, car, public</div>
    </button>
    
    <button data-intent="service_workflow" data-payload='{"service":"education"}' style="padding:12px;border:1px solid #06b6d4;background:#ecfeff;color:#0891b2;border-radius:8px;font:12px system-ui;text-align:left">
      <div style="font:600 13px system-ui">🎓 Education</div>
      <div style="font:11px system-ui;opacity:0.8">Schools, childcare</div>
    </button>
    
    <button data-intent="service_workflow" data-payload='{"service":"pets"}' style="padding:12px;border:1px solid #84cc16;background:#f7fee7;color:#65a30d;border-radius:8px;font:12px system-ui;text-align:left">
      <div style="font:600 13px system-ui">🐕 Pet Relocation</div>
      <div style="font:11px system-ui;opacity:0.8">Quarantine, docs</div>
    </button>
    
    <button data-intent="service_workflow" data-payload='{"service":"utilities"}' style="padding:12px;border:1px solid #6b7280;background:#f9fafb;color:#374151;border-radius:8px;font:12px system-ui;text-align:left">
      <div style="font:600 13px system-ui">⚡ Utilities</div>
      <div style="font:11px system-ui;opacity:0.8">Power, internet, water</div>
    </button>
  </div>

  <div style="margin-top:16px;padding:12px;background:#f0f9ff;border:1px solid #0ea5e9;border-radius:8px">
    <div style="font:600 13px system-ui;color:#0c4a6e;margin-bottom:6px">🎯 Recommended Priority</div>
    <div style="font:12px system-ui;color:#075985">1. Immigration → 2. Shipping → 3. Housing → 4. Finance → 5. Healthcare</div>
  </div>
</div>`
  gullieSay(html)
}
