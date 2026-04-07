import { base44 } from '@/api/base44Client';

const EMAIL_TEMPLATES = [
  {
    name: 'Thank You — New Customer',
    category: 'Thank You',
    subject: 'Thank you for choosing [COMPANY_NAME]!',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
     <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
     <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
   </div>
   <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
     <p style="font-size: 16px;">Dear [CUSTOMER_FIRST_NAME],</p>
     <p>Welcome to the [COMPANY_NAME] family! We are thrilled to have you as a new customer and want to thank you for choosing us for your HVAC needs.</p>
     <p>We take great pride in providing professional, reliable service and high-quality workmanship. Your comfort and satisfaction are our top priorities.</p>
     <p>If you ever have any questions, concerns, or need service in the future, please don't hesitate to reach out. We are always here to help!</p>
     <div style="background: #f4f7fa; border-left: 4px solid #1E3A5F; padding: 16px; margin: 24px 0; border-radius: 4px;">
       <p style="margin: 0; font-weight: 700; color: #1E3A5F;">Contact Us Anytime</p>
       <p style="margin: 8px 0 0 0;">[COMPANY_PHONE]<br/>[COMPANY_EMAIL]</p>
     </div>
     <p>Thank you again for your trust and business. We look forward to serving you for many years to come!</p>
     <p>Best regards,<br/><strong>[COMPANY_NAME]</strong></p>
   </div>
 </div>`,
    isDefault: true,
    platform: 'All',
  },
    {
    name: 'Thank You — After Service',
    category: 'Thank You',
    subject: 'Thank you for having us out, [CUSTOMER_FIRST_NAME]!',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size: 16px;">Dear [CUSTOMER_FIRST_NAME],</p>
    <p>Thank you for having us out today! It was a pleasure serving you and we hope everything is working perfectly to your satisfaction.</p>
    <p>If you notice anything unusual or have any concerns about your system in the coming days, please don't hesitate to call us right away. We stand behind our work and want to make sure you are 100% satisfied.</p>
    <p><strong>Remember:</strong> Regular maintenance is the best way to keep your system running efficiently and avoid costly breakdowns. Ask us about our maintenance plans!</p>
    <div style="background: #f4f7fa; border-left: 4px solid #1E3A5F; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: 700; color: #1E3A5F;">We're Always Here For You</p>
      <p style="margin: 8px 0 0 0;">[COMPANY_PHONE]<br/>[COMPANY_EMAIL]</p>
    </div>
    <p>Thank you again for your business — we truly appreciate it!</p>
    <p>Best regards,<br/><strong>[COMPANY_NAME]</strong></p>
    </div>
    </div>`,
    isDefault: false,
    platform: 'All',
    },
    {
    name: 'Review Request — All Platforms',
    category: 'Review Request',
    subject: 'How did we do, [CUSTOMER_FIRST_NAME]? We\'d love your feedback!',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size: 16px;">Dear [CUSTOMER_FIRST_NAME],</p>
    <p>We hope you are enjoying your HVAC system and that everything is running perfectly! We truly appreciate your business and hope we exceeded your expectations.</p>
    <p style="font-weight: 700; font-size: 16px; color: #1E3A5F;">Would you mind taking 2 minutes to leave us a review?</p>
    <p>Your feedback means the world to us and helps other homeowners in our community find reliable HVAC service. Please choose your preferred platform below:</p>
    <div style="text-align:center; margin:20px 0;">
      <a href="[GOOGLE_REVIEW_LINK]" style="display:inline-block; background-color:#2E9CCA; color:#ffffff; padding:14px 32px; border-radius:6px; text-decoration:none; font-weight:bold; font-family:Arial,sans-serif; font-size:15px; margin:6px auto; width:220px;">⭐ Leave a Google Review</a><br>
      <a href="[FACEBOOK_REVIEW_LINK]" style="display:inline-block; background-color:#2E9CCA; color:#ffffff; padding:14px 32px; border-radius:6px; text-decoration:none; font-weight:bold; font-family:Arial,sans-serif; font-size:15px; margin:6px auto; width:220px;">👍 Leave a Facebook Review</a><br>
      <a href="[YELP_REVIEW_LINK]" style="display:inline-block; background-color:#2E9CCA; color:#ffffff; padding:14px 32px; border-radius:6px; text-decoration:none; font-weight:bold; font-family:Arial,sans-serif; font-size:15px; margin:6px auto; width:220px;">⭐ Leave a Yelp Review</a><br>
      <a href="[NEXTDOOR_REVIEW_LINK]" style="display:inline-block; background-color:#2E9CCA; color:#ffffff; padding:14px 32px; border-radius:6px; text-decoration:none; font-weight:bold; font-family:Arial,sans-serif; font-size:15px; margin:6px auto; width:220px;">🏘️ Recommend Us on Nextdoor</a>
    </div>
    <p style="color: #666; font-size: 13px; font-style: italic;">It only takes 2 minutes and makes a huge difference for our small business. Thank you so much!</p>
    <p>Best regards,<br/><strong>[COMPANY_NAME]</strong></p>
    </div>
    </div>`,
    isDefault: true,
    platform: 'All',
    },
  {
    name: 'Review Request — Google',
    category: 'Review Request',
    subject: 'Quick favor, [CUSTOMER_FIRST_NAME] — can you leave us a Google review?',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size: 16px;">Dear [CUSTOMER_FIRST_NAME],</p>
    <p>Thank you so much for choosing [COMPANY_NAME]! We hope your experience with us was excellent.</p>
    <p>We have a quick favor to ask — could you take 2 minutes to leave us a Google review? Google reviews help other homeowners in our community find trustworthy HVAC service, and they make a huge difference for our small business.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="[GOOGLE_REVIEW_LINK]" style="display: inline-block; background-color: #2E9CCA; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px;">
        ⭐ Leave a Google Review
      </a>
    </div>
    <p style="color: #666; font-size: 13px; font-style: italic;">Clicking the button above will take you directly to our Google review page. It only takes 2 minutes!</p>
    <p>Thank you so much — we truly appreciate your support!</p>
    <p>Best regards,<br/><strong>[COMPANY_NAME]</strong></p>
    </div>
    </div>`,
    isDefault: false,
    platform: 'Google',
    },
  {
    name: 'Review Request — Facebook',
    category: 'Review Request',
    subject: '[CUSTOMER_FIRST_NAME], would you recommend us on Facebook?',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size: 16px;">Dear [CUSTOMER_FIRST_NAME],</p>
    <p>Thank you so much for choosing [COMPANY_NAME]! We hope your experience with us was excellent.</p>
    <p>We have a quick favor to ask — could you take 2 minutes to recommend us on Facebook? Facebook recommendations help other homeowners in our community find trustworthy HVAC service, and they make a huge difference for our small business.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="[FACEBOOK_REVIEW_LINK]" style="display: inline-block; background-color: #2E9CCA; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px;">
        👍 Leave a Facebook Review
      </a>
    </div>
    <p style="color: #666; font-size: 13px; font-style: italic;">Clicking the button above will take you directly to our Facebook page. It only takes 2 minutes!</p>
    <p>Thank you so much — we truly appreciate your support!</p>
    <p>Best regards,<br/><strong>[COMPANY_NAME]</strong></p>
    </div>
    </div>`,
    isDefault: false,
    platform: 'Facebook',
    },
  {
    name: 'Review Request — Yelp',
    category: 'Review Request',
    subject: '[CUSTOMER_FIRST_NAME], would you review us on Yelp?',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size: 16px;">Dear [CUSTOMER_FIRST_NAME],</p>
    <p>Thank you so much for choosing [COMPANY_NAME]! We hope your experience with us was excellent.</p>
    <p>We have a quick favor to ask — could you take 2 minutes to leave us a Yelp review? Yelp reviews help other homeowners in our community find trustworthy HVAC service, and they make a huge difference for our small business.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="[YELP_REVIEW_LINK]" style="display: inline-block; background-color: #2E9CCA; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px;">
        ⭐ Leave a Yelp Review
      </a>
    </div>
    <p style="color: #666; font-size: 13px; font-style: italic;">Clicking the button above will take you directly to our Yelp review page. It only takes 2 minutes!</p>
    <p>Thank you so much — we truly appreciate your support!</p>
    <p>Best regards,<br/><strong>[COMPANY_NAME]</strong></p>
    </div>
    </div>`,
    isDefault: false,
    platform: 'Yelp',
    },
  {
    name: 'Review Request — Nextdoor',
    category: 'Review Request',
    subject: '[CUSTOMER_FIRST_NAME], recommend us to your neighbors on Nextdoor!',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size: 16px;">Dear [CUSTOMER_FIRST_NAME],</p>
    <p>Thank you so much for choosing [COMPANY_NAME]! We hope your experience with us was excellent.</p>
    <p>We have a quick favor to ask — could you take 2 minutes to recommend us on Nextdoor? Nextdoor recommendations help your neighbors find trustworthy HVAC service, and they make a huge difference for our small business.</p>
    <div style="text-align: center; margin: 28px 0;">
      <a href="[NEXTDOOR_REVIEW_LINK]" style="display: inline-block; background-color: #2E9CCA; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px;">
        🏘️ Recommend Us on Nextdoor
      </a>
    </div>
    <p style="color: #666; font-size: 13px; font-style: italic;">Clicking the button above will take you directly to our Nextdoor profile. It only takes 2 minutes!</p>
    <p>Thank you so much — we truly appreciate your support!</p>
    <p>Best regards,<br/><strong>[COMPANY_NAME]</strong></p>
    </div>
    </div>`,
    isDefault: false,
    platform: 'Nextdoor',
    },
  {
    name: 'Bid Follow-Up',
    category: 'Bid Follow-up',
    subject: 'Following up on your HVAC estimate, [CUSTOMER_FIRST_NAME]',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size: 16px;">Dear [CUSTOMER_FIRST_NAME],</p>
    <p>I wanted to follow up on the HVAC estimate we recently sent you. We hope you had a chance to review the proposal and that everything looked clear and competitive.</p>
    <p>If you have any questions about the scope of work, materials, pricing, or financing options, we would love to chat and address any concerns. There is no pressure — we just want to make sure you have everything you need to make the best decision for your home and family.</p>
    <div style="background: #f4f7fa; border-left: 4px solid #1E3A5F; padding: 16px; margin: 24px 0; border-radius: 4px;">
      <p style="margin: 0; font-weight: 700; color: #1E3A5F;">Ready to move forward? Give us a call!</p>
      <p style="margin: 8px 0 0 0;">[COMPANY_PHONE]<br/>[COMPANY_EMAIL]</p>
    </div>
    <p>We appreciate the opportunity to earn your business and look forward to hearing from you!</p>
    <p>Best regards,<br/><strong>[COMPANY_NAME]</strong></p>
    </div>
    </div>`,
    isDefault: false,
    platform: 'All',
    },
    {
    name: 'Appointment Reminder',
    category: 'Appointment Reminder',
    subject: 'Reminder: Your HVAC appointment is tomorrow, [CUSTOMER_FIRST_NAME]',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size: 16px;">Dear [CUSTOMER_FIRST_NAME],</p>
    <p>This is a friendly reminder that you have an HVAC appointment scheduled with [COMPANY_NAME]!</p>
    <div style="background: #e8f4fd; border: 1px solid #b3d9f0; padding: 20px; border-radius: 6px; margin: 24px 0;">
      <p style="margin: 0; font-weight: 700; font-size: 16px; color: #1E3A5F;">📅 Appointment Details</p>
      <p style="margin: 12px 0 0 0;"><strong>Date:</strong> [APPOINTMENT_DATE]</p>
      <p style="margin: 6px 0;"><strong>Time:</strong> [APPOINTMENT_TIME]</p>
      <p style="margin: 6px 0;"><strong>Address:</strong> [CUSTOMER_ADDRESS]</p>
      <p style="margin: 6px 0;"><strong>Type:</strong> [APPOINTMENT_TYPE]</p>
      <p style="margin: 6px 0;"><strong>Your Technician:</strong> [ASSIGNED_TECH]</p>
    </div>
    <p>To help us serve you efficiently, please ensure there is clear access to your HVAC equipment. If you need to reschedule, please call us as soon as possible.</p>
    <p>We look forward to seeing you!</p>
    <p>Best regards,<br/><strong>[COMPANY_NAME]</strong></p>
    </div>
    </div>`,
    isDefault: false,
    platform: 'All',
    },
    {
    name: 'Welcome — New Lead',
    category: 'Welcome',
    subject: 'Thank you for reaching out to [COMPANY_NAME]!',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size: 16px;">Dear [CUSTOMER_FIRST_NAME],</p>
    <p>&nbsp;</p>
    <p>Thank you for reaching out to [COMPANY_NAME]! We are truly excited about the opportunity to help you with your HVAC needs and want you to know you are in great hands.</p>
    <p>One of our team members will be in touch with you shortly to learn more about your project, answer any questions, and get you taken care of as quickly as possible.</p>
    <p>&nbsp;</p>
    <p>Best regards,</p>
    <p><strong>The [COMPANY_NAME] Team</strong></p>
    <p>&nbsp;</p>
    <p style="color: #555555; font-size: 14px; font-style: italic;">Your comfort is our priority — we look forward to serving you!</p>
  </div>
</div>`,
    isDefault: false,
    platform: 'All',
    },
    {
    name: 'Maintenance Reminder',
    category: 'Promotion',
    subject: 'Time for your HVAC tune-up, [CUSTOMER_FIRST_NAME]!',
    body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; padding-bottom: 24px;">
  <div style="background-color: #1E3A5F; padding: 24px; text-align: center; border-radius: 6px 6px 0 0;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px;">[COMPANY_NAME]</h1>
    <p style="color: #aac8e8; margin: 4px 0 0 0; font-size: 13px;">[COMPANY_PHONE] · [COMPANY_EMAIL]</p>
  </div>
  <div style="background: #ffffff; border: 1px solid #e0e0e0; border-top: none; padding: 32px; border-radius: 0 0 6px 6px;">
    <p style="font-size: 16px;">Dear [CUSTOMER_FIRST_NAME],</p>
    <p>It has been a while since we last serviced your HVAC system, and we wanted to reach out to remind you that regular maintenance is the key to keeping your system running efficiently, reducing energy bills, and avoiding unexpected breakdowns.</p>
    <p><strong>Did you know?</strong> A properly maintained HVAC system can last 15-20 years, while a neglected system may fail in as little as 8-10 years.</p>
    <div style="background: #e8f5e9; border: 1px solid #a5d6a7; padding: 20px; border-radius: 6px; margin: 24px 0;">
      <p style="margin: 0; font-weight: 700; color: #1E8449; font-size: 16px;">✅ Our Tune-Up Includes:</p>
      <ul style="margin: 12px 0 0 0; padding-left: 20px; line-height: 1.8;">
        <li>Full system inspection</li>
        <li>Filter replacement</li>
        <li>Coil cleaning</li>
        <li>Refrigerant level check</li>
        <li>Electrical connections inspection</li>
        <li>Thermostat calibration</li>
        <li>Drain line clearing</li>
      </ul>
    </div>
    <p>Call us today to schedule your maintenance visit before the season gets busy!</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="tel:[COMPANY_PHONE]" style="display: inline-block; background-color: #1E3A5F; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 15px;">
        📞 Call to Schedule: [COMPANY_PHONE]
      </a>
    </div>
    <p>Best regards,<br/><strong>[COMPANY_NAME]</strong></p>
    </div>
    </div>`,
    isDefault: false,
    platform: 'All',
    },
    ];

    // Helper function to update review templates with real URLs from Settings
    export async function updateReviewTemplateUrls(settings) {
    try {
    const templates = await base44.entities.EmailTemplate.list('-created_date', 100);

    const templateUpdates = [];

    templates.forEach(t => {
     let updatedBody = t.body;
     let changed = false;

     // Review Request — All Platforms
     if (t.name === 'Review Request — All Platforms') {
       const newButtons = [];
       if (settings?.googleReviewUrl) newButtons.push(`<a href="${settings.googleReviewUrl}" style="display:inline-block; background-color:#2E9CCA; color:#ffffff; padding:14px 32px; border-radius:6px; text-decoration:none; font-weight:bold; font-family:Arial,sans-serif; font-size:15px; margin:6px auto; width:220px;">⭐ Leave a Google Review</a>`);
       if (settings?.facebookReviewUrl) newButtons.push(`<a href="${settings.facebookReviewUrl}" style="display:inline-block; background-color:#2E9CCA; color:#ffffff; padding:14px 32px; border-radius:6px; text-decoration:none; font-weight:bold; font-family:Arial,sans-serif; font-size:15px; margin:6px auto; width:220px;">👍 Leave a Facebook Review</a>`);
       if (settings?.yelpUrl) newButtons.push(`<a href="${settings.yelpUrl}" style="display:inline-block; background-color:#2E9CCA; color:#ffffff; padding:14px 32px; border-radius:6px; text-decoration:none; font-weight:bold; font-family:Arial,sans-serif; font-size:15px; margin:6px auto; width:220px;">⭐ Leave a Yelp Review</a>`);
       if (settings?.nextdoorUrl) newButtons.push(`<a href="${settings.nextdoorUrl}" style="display:inline-block; background-color:#2E9CCA; color:#ffffff; padding:14px 32px; border-radius:6px; text-decoration:none; font-weight:bold; font-family:Arial,sans-serif; font-size:15px; margin:6px auto; width:220px;">🏘️ Recommend Us on Nextdoor</a>`);
       const buttonsHtml = `<div style="text-align:center; margin:20px 0;">${newButtons.join('<br>')}</div>`;
       updatedBody = updatedBody.replace(/<div style="text-align:center; margin:20px 0;">[\s\S]*?<\/div>(?=\s*<p style="color: #666;)/m, buttonsHtml);
       changed = true;
     }

     // Review Request — Google
     if (t.name === 'Review Request — Google' && settings?.googleReviewUrl) {
       updatedBody = updatedBody.replace(/href=""/g, (match, offset) => {
         return updatedBody.substring(offset - 50).includes('Google') ? `href="${settings.googleReviewUrl}"` : match;
       });
       const regex = /href=""[\s\S]{0,200}?Google/;
       updatedBody = updatedBody.replace(regex, `href="${settings.googleReviewUrl}"`.concat(updatedBody.match(regex)[0].substring(7)));
       // Simpler approach
       updatedBody = updatedBody.replace(/(<a href="")([^"]*)("][^>]*>[\s\S]*?⭐ Leave a Google Review)/m, `$1${settings.googleReviewUrl}$3`);
       changed = true;
     }

     // Review Request — Facebook
     if (t.name === 'Review Request — Facebook' && settings?.facebookReviewUrl) {
       updatedBody = updatedBody.replace(/(<a href="")([^"]*)("][^>]*>[\s\S]*?👍 Leave a Facebook Review)/m, `$1${settings.facebookReviewUrl}$3`);
       changed = true;
     }

     // Review Request — Yelp
     if (t.name === 'Review Request — Yelp' && settings?.yelpUrl) {
       updatedBody = updatedBody.replace(/(<a href="")([^"]*)("][^>]*>[\s\S]*?⭐ Leave a Yelp Review)/m, `$1${settings.yelpUrl}$3`);
       changed = true;
     }

     // Review Request — Nextdoor
     if (t.name === 'Review Request — Nextdoor' && settings?.nextdoorUrl) {
       updatedBody = updatedBody.replace(/(<a href="")([^"]*)("][^>]*>[\s\S]*?🏘️ Recommend Us on Nextdoor)/m, `$1${settings.nextdoorUrl}$3`);
       changed = true;
     }

     if (changed && updatedBody !== t.body) {
       templateUpdates.push({ id: t.id, body: updatedBody });
     }
    });

    // Batch update templates
    for (const update of templateUpdates) {
     await base44.entities.EmailTemplate.update(update.id, { body: update.body });
    }

    console.log(`Updated ${templateUpdates.length} review templates with new URLs`);
    } catch (error) {
    console.error('Failed to update review template URLs:', error);
    }
    }

export async function seedEmailTemplates() {
  try {
    const existing = await base44.entities.EmailTemplate.list('-created_date', 1);
    if (existing && existing.length > 0) {
      console.log('Email templates already seeded — skipping');
      return;
    }

    console.log('Seeding email templates...');
    await base44.entities.EmailTemplate.bulkCreate(EMAIL_TEMPLATES);
    console.log('✅ Email templates seeded successfully');
  } catch (error) {
    console.error('Failed to seed email templates:', error);
  }
}