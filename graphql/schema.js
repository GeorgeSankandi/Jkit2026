const { buildSchema } = require('graphql');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Ensure you have GEMINI_API_KEY in your .env file
// Initialize with empty string if not set to prevent errors, but check before use
const genAI = process.env.GEMINI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

// GraphQL Schema Definition
const schema = buildSchema(`
    type Explanation {
        what: String!
        why: String!
        how: String!
        performance: String!
    }

    type QueryResponse {
        action: String!
        message: String
        targetPage: String
        targetSectionId: String 
        postNavigationMessage: String
        details: Explanation
    }

    type RootQuery {
        processUserQuery(text: String!): QueryResponse
    }

    schema {
        query: RootQuery
    }
`);

// --- LLM Interaction Functions ---

async function classifyIntent(text) {
    // Verified: Using gemini-2.0-flash-lite
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const WEBSITE_CONTEXT = `
      - Home Page (id: home-page)
        Sections: Upcoming Events (id: important-events-grid), Featured Jobs (id: featured-jobs-carousel), Featured People (id: featured-people-carousel), How It Works (id: feature-block).
      - About Page (id: about-page)
        Sections: Our Story (id: about-layout-container), Vision & Mission (id: vision-mission-grid), Our Values (id: values-section), Who We Serve (id: target-audience-section).
      - Jobs Page (id: jobs-page)
        Sections: Job Filters (id: jobs-filter-container), Job Listings (id: jobs-grid).
      - People Page (id: people-page)
        Sections: People Filters (id: people-page .airbnb-filters-container), People Listings (id: people-grid).
      - Employers Page (id: employers-page)
        Sections: Employer Filters, Employer Listings (id: employers-grid).
      - Agency Page (id: zone-page)
        Sections: Agency Filters (id: zone-page .airbnb-filters-container), Agency Listings (id: agencies-grid).
      - Contact Page (id: contact-page)
        Sections: Contact Form (id: contact-form), Contact Info (id: contact-info-wrapper).
      - Dashboard Page (id: dashboard-page)
        Action: This page is for logged-in users. Advise the user to log in and click the 'Dashboard' button or their avatar. Do not provide direct navigation.
    `;

    const prompt = `
        You are an expert AI assistant for "J-KIT", a platform connecting job seekers, talents, and employers in Namibia. Your primary skill is understanding natural language, including synonyms, context, and descriptive problems, and mapping them to the correct section of the website.
        Your knowledge is strictly limited to the website's content, described in the sitemap below. You MUST politely refuse to answer any questions outside this scope.

        SITEMAP WITH KEYWORDS:
        ${WEBSITE_CONTEXT}

        --- INSTRUCTIONS ---
        Analyze the user's query holistically. Understand the user's intent, not just keywords.

        Return your response ONLY as a valid JSON object with "intent" and "data" keys.

        1. If intent is "EXPLAIN":
           The user wants a detailed explanation of a concept related to J-KIT.
           { "intent": "EXPLAIN", "data": { "topic": "the specific topic", "targetPage": "page-id-or-null", "targetSectionId": "section-id-or-null" } }
           Example: "what is an agency on jkit?" -> {"intent": "EXPLAIN", "data": {"topic": "agencies on J-KIT", "targetPage": "zone-page", "targetSectionId": "agencies-grid"}}

        2. If intent is "NAVIGATE":
           The user wants to find something on the site. Use your reasoning and the sitemap to find the best page and section.
           { "intent": "NAVIGATE", "data": { "targetPage": "page-id", "targetSectionId": "section-id-or-null", "postNavigationMessage": "A dynamic message explaining the navigation." } }
           
           Navigation Examples:
           - User: "i need a cleaner" -> {"intent": "NAVIGATE", "data": {"targetPage": "jobs-page", "targetSectionId": "jobs-grid", "postNavigationMessage": "You're looking for a cleaner. I've taken you to our jobs page where you can search for cleaning gigs or post your own."}}
           - User: "how can I hire a photographer?" -> {"intent": "NAVIGATE", "data": {"targetPage": "people-page", "targetSectionId": "people-grid", "postNavigationMessage": "To hire a photographer, you can browse our 'People' page. I've opened it for you."}}
           - User: "I want to find a company" -> {"intent": "NAVIGATE", "data": {"targetPage": "employers-page", "targetSectionId": "employers-grid", "postNavigationMessage": "You can browse registered employers here."}}
           - User: "what is this site about?" -> {"intent": "NAVIGATE", "data": {"targetPage": "about-page", "targetSectionId": "about-layout-container", "postNavigationMessage": "Here is our story. I've navigated you to the 'About Us' page."}}
           - User: "how do I get in touch?" -> {"intent": "NAVIGATE", "data": {"targetPage": "contact-page", "targetSectionId": "contact-form", "postNavigationMessage": "To get in touch, you can use the contact form on this page or find our details listed."}}
           - User: "how do I manage my profile?" -> {"intent": "NAVIGATE", "data": {"targetPage": "dashboard-page", "targetSectionId": null, "postNavigationMessage": "To manage your profile, please log in and click on the 'Dashboard' button or your avatar."}}

        3. If intent is "GREETING":
           { "intent": "GREETING", "data": { "message": "Hello! I'm the J-KIT assistant. How can I help you find jobs, talent, or information today?" } }

        4. If intent is "OUT_OF_CONTEXT":
           { "intent": "OUT_OF_CONTEXT", "data": { "message": "I can only help with questions about the J-KIT platform and its services. How can I assist you with finding jobs or talent?" } }
        
        User Query: "${text}"
    `;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    try {
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Failed to parse LLM classification response:", responseText);
        return { intent: 'OTHER', data: { message: 'fallback' } };
    }
}

async function generateExplanation(topic) {
    // Verified: Using gemini-2.0-flash-lite
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    const prompt = `You are an expert assistant for the J-KIT platform. Explain the concept of "${topic}" to a user in four distinct parts. Respond ONLY with a valid JSON object with the keys "what", "why", "how", and "performance".`;
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
     try {
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (e) {
        console.error("Failed to parse LLM explanation response:", responseText);
        return { what: 'Error', why: 'Could not generate explanation.', how: '', performance: '' };
    }
}

// --- NEW/UPDATED FUNCTION FOR AI JOB CATEGORIZATION ---
async function suggestCategory(jobTitle, jobDescription, existingCategories) {
    // Validate API key
    if (!process.env.GEMINI_API_KEY || !genAI) {
        console.error("GEMINI_API_KEY is not set in environment variables. AI categorization will not work.");
        return { name: 'Uncategorized', isNew: false };
    }

    // Handle missing or invalid inputs
    if (!jobTitle || typeof jobTitle !== 'string' || jobTitle.trim() === '') {
        console.error("Invalid job title provided to suggestCategory");
        return { name: 'Uncategorized', isNew: false };
    }

    // Handle missing description - use empty string or a default message
    const safeDescription = (jobDescription && typeof jobDescription === 'string' && jobDescription.trim() !== '') 
        ? jobDescription.trim() 
        : 'No description provided';

    // Ensure existingCategories is an array
    const categories = Array.isArray(existingCategories) ? existingCategories : [];
    const categoryList = categories.length > 0 ? categories.join(', ') : 'None (this will be the first category)';

    try {
        // Verified: Using gemini-2.0-flash-lite
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

        const prompt = `
        You are an intelligent categorization assistant for a job platform called J-KIT.
        Your task is to analyze a new job posting and place it into the most appropriate category.
        You can either use one of the existing categories or, if none are suitable, create a new, sensible category name.

        Here is the list of existing categories:
        ${categoryList}

        Here is the new job posting:
        - Title: "${jobTitle.trim()}"
        - Description: "${safeDescription}"

        Instructions:
        1.  Read the title and description carefully to understand the job's core function.
        2.  Compare this understanding against the list of existing categories.
        3.  If a suitable category exists, choose it. The match doesn't have to be exact, but it should be logical (e.g., "House painter" fits into "Skilled trades, Building and Maintenance").
        4.  If NO existing category is a good fit, create a concise and professional new category name (e.g., "Event Management", "Animal Care", "Data Science"). Do not create a new category if a reasonable one already exists.
        5.  Your response MUST be a single, valid JSON object with two keys:
            - "name": The chosen or newly created category name (string).
            - "isNew": A boolean value, 'true' if you created a new category, 'false' otherwise.

        Example 1 (Existing):
        Input: Title="Babysitter Needed for Weekend", Description="Looking for a reliable person to watch our two kids..."
        Existing Categories: ["Domestic work", "Skilled trades...", ...]
        Output: { "name": "Domestic work", "isNew": false }

        Example 2 (New):
        Input: Title="Data Analyst for E-commerce startup", Description="We need a data analyst to track KPIs and build dashboards..."
        Existing Categories: ["Domestic work", "I.T jobs", ...] (Assuming "Data Science" is not in the list)
        Output: { "name": "Data Science", "isNew": true }

        Now, analyze the provided job posting and return the JSON object.
    `;
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        try {
            // Clean up the response - remove markdown code blocks if present
            let cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            // Remove any leading/trailing whitespace or newlines
            cleanJson = cleanJson.replace(/^\s+|\s+$/g, '');
            
            const parsed = JSON.parse(cleanJson);
            
            // Validate the response structure
            if (!parsed.name || typeof parsed.name !== 'string') {
                console.error("Invalid AI response: missing or invalid 'name' field", parsed);
                return { name: 'Uncategorized', isNew: false };
            }
            
            if (typeof parsed.isNew !== 'boolean') {
                // Try to convert string booleans
                parsed.isNew = parsed.isNew === true || parsed.isNew === 'true';
            }
            
            return parsed;
        } catch (parseError) {
            console.error("Failed to parse LLM suggestion response:", {
                error: parseError.message,
                rawResponse: responseText,
                jobTitle: jobTitle
            });
            // Fallback in case of parsing error
            return { name: 'Uncategorized', isNew: false };
        }
    } catch (apiError) {
        console.error("AI API error during job categorization:", {
            error: apiError.message,
            stack: apiError.stack,
            jobTitle: jobTitle
        });
        // Fallback in case of API error
        return { name: 'Uncategorized', isNew: false };
    }
}


const root = {
    processUserQuery: async ({ text }) => {
        const classification = await classifyIntent(text);

        switch (classification.intent) {
            case 'EXPLAIN':
                const details = await generateExplanation(classification.data.topic);
                return {
                    action: 'EXPLAIN',
                    details: details,
                    targetPage: classification.data.targetPage,
                    targetSectionId: classification.data.targetSectionId,
                    postNavigationMessage: `Because you asked about ${classification.data.topic}, I've taken you to the most relevant section on our site. Here are more details:`
                };

            case 'NAVIGATE':
                return {
                    action: 'NAVIGATE',
                    targetPage: classification.data.targetPage,
                    targetSectionId: classification.data.targetSectionId,
                    postNavigationMessage: classification.data.postNavigationMessage
                };

            case 'GREETING':
            case 'OUT_OF_CONTEXT':
                return { action: 'MESSAGE', message: classification.data.message };

            default:
                return { action: 'MESSAGE', message: "I'm having a little trouble understanding. Please try rephrasing." };
        }
    }
};

module.exports = { schema, root, suggestCategory };