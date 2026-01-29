// utils/seedData.js
const bcrypt = require('bcryptjs');

// We pre-hash passwords and manually assign J-KIT IDs here because
// insertMany() bypasses the Mongoose pre-save hooks that usually generate them.
const users = {
    'masterjkit': { 
        username: 'MasterJkit', 
        password: bcrypt.hashSync('pandora@2025', 10), 
        fullName: 'J-KIT Admin', 
        type: 'Agent', 
        email: 'admin@jkit.com', 
        cellphone: '0810000000', 
        namibiaId: '90010100001', 
        jkitId: 'A-JIN-000001', // Added
        isVerified: true 
    },
    'helman': { 
        username: 'helman', 
        password: bcrypt.hashSync('123', 10), 
        fullName: 'Helman', 
        type: 'Worker', 
        email: 'helman@example.com', 
        cellphone: '0810000001', 
        namibiaId: '95010100002', 
        jkitId: 'I-JIN-000001', // Added
        isVerified: true 
    },
    'frans': { 
        username: 'frans', 
        password: bcrypt.hashSync('123', 10), 
        fullName: 'Frans Nande Malima', 
        type: 'Agent', 
        email: 'frans.malima@agency.com', 
        cellphone: '0810000002', 
        namibiaId: '88010100003', 
        jkitId: 'A-JIN-000002', // Added
        isVerified: true 
    },
    'melrile': { 
        username: 'melrile', 
        password: bcrypt.hashSync('123', 10), 
        fullName: 'Melrile Guest House', 
        type: 'Employer', 
        email: 'melrile@example.com', 
        cellphone: '0810000003', 
        namibiaId: '80010100004', 
        jkitId: 'B-JIN-000001', // Added
        isVerified: true 
    },
    'ndiina': { 
        username: 'ndiina', 
        password: bcrypt.hashSync('123', 10), 
        fullName: 'Ndiina Malima', 
        type: 'Worker', 
        email: 'ndiina@example.com', 
        cellphone: '0810000004', 
        namibiaId: '99010100005', 
        jkitId: 'I-JIN-000002', // Added
        isVerified: true 
    },
    'angel': { 
        username: 'angel', 
        password: bcrypt.hashSync('123', 10), 
        fullName: 'Angel Kulo', 
        type: 'Talent', 
        email: 'angel@example.com', 
        cellphone: '0810000005', 
        namibiaId: '00010100006', 
        jkitId: 'I-JIN-000003', // Added
        isVerified: true 
    },
    'given': { 
        username: 'given', 
        password: bcrypt.hashSync('123', 10), 
        fullName: 'Given Herman', 
        type: 'Talent', 
        email: 'given@example.com', 
        cellphone: '0810000006', 
        namibiaId: '01010100007', 
        jkitId: 'I-JIN-000004', // Added
        isVerified: true 
    }
};

const profiles = {
    'masterjkit': { username: 'MasterJkit', fullName: 'J-KIT Admin', bio: 'Platform Administrator.', skills: ['Management', 'Support'], avatarPath: 'https://i.ibb.co/tZ0b6c6/admin-avatar.png', email: 'admin@jkit.com', phone: '0810000000', location: 'Windhoek, Namibia' },
    'helman': { username: 'helman', fullName: 'Helman', bio: 'Experienced yard cleaner...', skills: ['Yard Cleaning', 'General Labour'], avatarPath: 'https://i.ibb.co/dMvLz52/person1.jpg', email: 'helman@example.com', phone: '0810000001', location: 'Katutura, Windhoek' },
    'frans': { username: 'frans', fullName: 'Frans Nande Malima', bio: 'Founder of Frans Man Agency...', skills: ['Recruitment', 'Management'], avatarPath: 'https://i.ibb.co/N1PqG7j/agent1.jpg', phone: '081-123-4567', email: 'frans.malima@agency.com', linkedin: 'https://linkedin.com/in/frans-malima', facebook: 'https://facebook.com/frans.agency', location: 'Windhoek West, Windhoek' },
    'melrile': { username: 'melrile', fullName: 'Melrile Guest House', bio: 'A premier guest house...', skills: ['Hospitality', 'Hiring'], avatarPath: 'https://i.ibb.co/3s6kDBx/employer1.jpg', email: 'melrile@example.com', phone: '0810000003', location: 'Swakopmund, Namibia' },
    'ndiina': { username: 'ndiina', fullName: 'Ndiina Malima', bio: 'Reliable and trustworthy cleaner...', skills: ['House cleaner', 'Laundry & ironing'], avatarPath: 'https://i.ibb.co/xXGj25v/person2.jpg', email: 'ndiina@example.com', phone: '0810000004', location: 'Khomasdal, Windhoek' },
    'angel': { username: 'angel', fullName: 'Angel Kulo', bio: 'One-day job specialist...', skills: ['Deep Cleaning', 'Move-out Cleaning'], avatarPath: 'https://i.ibb.co/yQjJz9B/person3.jpg', email: 'angel@example.com', phone: '0810000005', location: 'Eros, Windhoek' },
    'given': { username: 'given', fullName: 'Given Herman', bio: 'Versatile worker available...', skills: ['Yard cleaning', 'Car washing', 'DJs'], avatarPath: 'https://i.ibb.co/VvZ6fLg/person4.jpg', phone: '081-3414450', email: 'given@example.com', services: { 'Yard Cleaning': 300, 'Car Wash': 50, 'Stove Cleaning': 500 }, location: 'Okuryangava, Windhoek' }
};

const jobs = {
    'job1': { jobId: 'job1', title: 'Gardening', description: 'Need help maintaining a small garden. Mowing, weeding, and general cleanup.', category: 'Domestic work', jobType: 'Informal Job', location: 'Windhoek, Klein Windhoek', price: 300, payRate: 'per day', duration: 'Day', dueDate: new Date('2025-07-15'), imagePath: 'https://images.pexels.com/photos/4004128/pexels-photo-4004128.jpeg?auto=compress&cs=tinysrgb&w=600', postedBy: 'melrile', status: 'open', maxPeople: 5 },
    'job2': { jobId: 'job2', title: 'Professional painter', description: 'Looking for a qualified painter for a 3-bedroom house interior. Must have own tools and references.', category: 'Skilled trades, Building and Maintenance', jobType: 'Formal Job', location: 'Swakopmund, Vineta', price: 8500, payRate: 'once-off', duration: 'Temporal', dueDate: new Date('2025-08-01'), imagePath: 'https://images.pexels.com/photos/1855214/pexels-photo-1855214.jpeg?auto=compress&cs=tinysrgb&w=600', postedBy: 'frans', status: 'open', maxPeople: 1 },
    'job3': { jobId: 'job3', title: 'Delivery Driver', description: 'Urgent need for a driver with a valid license to do food deliveries in the city center.', category: 'Transport, Delivery & Logistics', jobType: 'Informal Job', location: 'Windhoek, CBD', price: 150, payRate: 'per hour', duration: 'Hour', dueDate: new Date('2025-07-20'), imagePath: 'https://images.pexels.com/photos/7922756/pexels-photo-7922756.jpeg?auto=compress&cs=tinysrgb&w=600', postedBy: 'melrile', status: 'open', maxPeople: 2 },
    'job4': { jobId: 'job4', title: 'Event Photographer', description: 'Photographer needed for a corporate event. Must have professional equipment and a portfolio.', category: 'ENTERTAINMENT, MEDIA & CREATIVE ARTS', jobType: 'Talent Gig', location: 'Windhoek Country Club', price: 2500, payRate: 'per day', duration: 'Day', dueDate: new Date('2025-09-10'), imagePath: 'https://images.pexels.com/photos/3184311/pexels-photo-3184311.jpeg?auto=compress&cs=tinysrgb&w=600', postedBy: 'frans', status: 'open', maxPeople: 1 }
};

const agencies = {
    'agency1': { 
        agencyId: 'agency1', 
        name: 'Frans Man Agency', 
        description: 'Frans Man Agency aims to help connect young people to opportunities...', 
        owner: 'frans', 
        imagePath: 'https://i.ibb.co/N1PqG7j/agent1.jpg', 
        members: ['helman', 'ndiina', 'angel', 'given'], 
        type: 'Individual Agency',
        location: 'Erf 4188, 03 Mayo Street, Windhoek West, Namibia', 
        services: { 'Talent Booking': 500, 'Job Placement': 1500, 'CV Revamp': 350 } 
    }
};

const jobCategoryData = [
    { 
        name: "Domestic work", 
        types: ["Unskilled odd jobs", "Informal", "Temporary"], 
        imagePath: 'https://images.pexels.com/photos/4239031/pexels-photo-4239031.jpeg?auto=compress&cs=tinysrgb&w=600', 
        jobs: [
            { name: "Babysitting", imagePath: "" }, { name: "Butler services", imagePath: "" },
            { name: "Caregiving (elderly care)", imagePath: "" }, { name: "Cleaning (general house cleaning)", imagePath: "" },
            { name: "Cooking / Meal preparation", imagePath: "" }, { name: "Dog walking / Pet care", imagePath: "" },
            { name: "Errand running", imagePath: "" }, { name: "Gardening", imagePath: "" },
            { name: "Handyman / Home maintenance", imagePath: "" }, { name: "Housekeeping", imagePath: "" },
            { name: "Ironing / Laundry services", imagePath: "" }, { name: "Live-in domestic assistance", imagePath: "" },
            { name: "Nanny services", imagePath: "" }, { name: "Organizing / Decluttering", imagePath: "" },
            { name: "Window cleaning", imagePath: "" }
        ] 
    },
    { name: "Skilled trades, Building and Maintenance", types: ["Semi-skilled trades", "Skilled (blue-collar)", "Formal", "Informal"], jobs: ["Bricklaying & Masonry", "Masonry assistant / mortar mixing", "Stone paving worker", "Carpenter", "Furniture repairer", "Door/window installer", "Roofing assistant", "Professional painter", "Spray painter", "House painting helper", "Qualified plumber", "Pipe fitter", "Gutter installer / cleaner", "Qualified electrician", "Solar panel installer", "Electrical assistant / wiring helper", "Appliance installer (stoves, fridges, geysers)", "Tiling & Flooring", "Flooring installer (laminate, vinyl)", "Welder (arc / MIG / )", "Welding helper / grinder operator", "Mechanic"].map(j => ({name: j, imagePath: ''})) },
    { name: "Transport, Delivery & Logistics", types: ["Semi-skilled trades", "Skilled (blue-collar)", "Formal", "Informal"], jobs: ["Taxi Driver", "Bus Driver", "Shuttle Driver", "Chauffeur / Private Driver", "Tour Bus Driver", "Minibus Driver", "Truck Driver", "Delivery Driver", "Van Driver", "Bulk Tanker Driver", "Cold Storage Truck Driver", "Livestock Transport Driver", "Tipper Truck Driver", "Ambulance Driver", "Fire Truck Driver", "Police Vehicle Driver", "Prisoner Transport Drive", "Utility Service Vehicle Driver", "Crane Operator", "Forklift Operator", "Excavator Operator", "Bulldozer Operator", "Grader Operator", "Front-End Loader Operator", "TLB Operator (Tractor Loader Backhoe)", "Compactor/Roller Operator", "Skid Steer Loader Operator", "Heavy Haul Truck Operator", "Tractor Driver", "Harvester/Combine Operator", "Planter/Seeder Operator", "Farm Utility Vehicle Driver", "Forestry Machine Operator", "Armoured Vehicle Driver", "Escort/Convoy Driver", "Pilot Vehicle Driver", "Waste Collection Truck Driver", "Street Sweeper Vehicle Operator", "Water Bowser Driver"].map(j => ({name: j, imagePath: ''})) },
    { name: "Retail, Vending & Street Trade", types: ["Unskilled odd jobs", "Informal"], jobs: ["Informal fruit & veg vendor", "Clothes & shoes seller (street/market)", "Airtime/data voucher seller", "Sim card & mobile accessory vendor", "Cold drinks / snacks vendor", "Braai meat stand operator", "Second-hand goods reseller", "Informal market cashier", "Street advertising board holder", "Car boot seller (second-hand trade)"].map(j => ({name: j, imagePath: ''})) },
    { name: "Repairs & Maintenance Services", types: ["Semi-skilled trades", "Skilled (blue-collar)", "Informal"], jobs: ["Shoe repair / cobbler", "Bicycle repairer", "Small appliance repair (kettle, iron, radio)", "Cellphone screen replacement / repair", "Tailoring / clothing alterations", "Upholstery repair assistant", "Vehicle mechanic (skilled)", "Panel beater / spray painter (cars)", "Locksmith / key cutter", "Domestic appliance installer (washing machine, fridge)"].map(j => ({name: j, imagePath: ''})) },
    { name: "Beauty, Grooming & Personal Services", types: ["Semi-skilled trades", "Creative talent", "Informal"], jobs: ["Barber / haircutter", "Hair braider / dreadlock stylist", "Makeup artist", "Nail technician", "Massage therapist (informal / trained)", "Street-side hairstyling assistant", "Fashion stylist / dresser", "Event makeover helper"].map(j => ({name: j, imagePath: ''})) },
    { name: "Education, Tutoring & Admin Support", types: ["Semi-skilled trades", "Formal", "Informal"], jobs: ["Private tutor", "Homework assistant", "Adult literacy coach", "Computer skills tutor", "Music teacher (piano, guitar, drums)", "Schoolwork photocopy runner", "Exam invigilator helper", "Library assistant", "Handwritten-to-digital typist", "Community workshop facilitator"].map(j => ({name: j, imagePath: ''})) },
    { name: "Health, Care & Wellness", types: ["Semi-skilled trades", "Formal"], jobs: ["Home-based caregiver", "Gym/fitness trainer", "Health outreach promoter", "Clinic queue runner", "Medicine delivery runner", "Community first aid assistant", "Peer counsellor", "Disability mobility assistant"].map(j => ({name: j, imagePath: ''})) },
    { name: "Agriculture & Farming", types: ["Unskilled odd jobs", "Semi-skilled trades"], jobs: ["Crop planting assistant", "Fruit/veg picker", "Livestock herder (cattle, goats, sheep)", "Poultry farm helper", "Fishery helper", "Dairy milker", "Beekeeping assistant", "Farm produce sorter/packer"].map(j => ({name: j, imagePath: ''})) },
    { name: "ENTERTAINMENT, MEDIA & CREATIVE ARTS", types: ["Creative talent", "Formal", "Informal", "Temporary"], jobs: ["Film Actor", "Television Actor", "Stage/Theatre Actor", "Voice Actor / Voice-over Artist", "Commercial Actor (Adverts)", "Stunt Performer", "Stand-up Comedian", "Sketch Performer", "Improvisational Comedian", "Ballet Dancer", "Contemporary Dancer", "Traditional / Cultural Dancer", "Dance Instructor / Choreographer", "Backup Dancer", "Fashion Model", "Commercial Model", "Runway Model", "Fitness Model", "Promotional / Event Model", "Vocalist / Singer (Solo / Band)", "Instrumentalist (Guitarist, Pianist, Drummer, etc.)", "Music Producer", "Songwriter / Composer", "Sound Engineer", "Beat maker", "DJ", "Turntablist", "Band Manager", "Music Promoter", "Roadie / Stage Technician", "Portrait Photographer", "Wedding Photographer", "Event Photographer", "Fashion Photographer", "Wildlife Photographer", "Sports Photographer", "Commercial / Product Photographer", "Event Videographer", "Music Video Director", "Film Cameraperson", "Corporate Videographer", "Drone Operator (Aerial Photography)", "Photo Editor", "Video Editor", "Colour Grader", "Television Presenter", "Radio Presenter", "Master of Ceremonies (MC) / Event Host", "Game Show Host", "Award Show Host", "Online Content Host (Webinars, Podcasts, Livestreams)", "Director (Film, TV, Stage)", "Assistant Director", "Scriptwriter / Screenwriter", "Producer", "Production Assistant", "Lighting Technician", "Sound Technician", "Camera Operator", "Set Designer / Stage Designs", "Makeup Artist", "Costume Designer / Wardrobe Stylist", "Props Manager", "Graphic Designer", "Illustrator", "Animator (2D / 3D)", "Special Effects Artist (VFX)", "Social Media Content Creator", "Influencer", "Podcast Producer / Host", "Blogger / Vlogger", "Event Planner (Entertainment Focus)", "Talent Agent / Booking Agent", "Publicist / PR Manager", "Entertainment Lawyer", "Tour Manager", "Stage Manager", "Promotions Officer"].map(j => ({name: j, imagePath: ''})) },
    { name: "BUSINESS, OFFICE & PROFESSIONAL SERVICES", types: ["Formal", "Temporary", "Permanent"], jobs: ["Office Administrator", "Receptionist", "Personal Assistant (PA)", "Secretary", "Data Entry Clerk", "Filing Clerk", "Virtual Assistant", "Office Messenger / Errand Runner", "Customer Service Representative", "Call Centre Agent", "Client Relationship Manager", "Help Desk Support", "Front Desk Officer", "After-sales Support Agent", "Accountant", "Bookkeeper", "Payroll Clerk", "Accounts Payable/Receivable Clerk", "Tax Consultant", "Financial Advisor", "Loan Officer", "Informal Money Lender / Microfinance Agent", "Sales Representative", "Business Development Officer", "Marketing Coordinator", "Brand Ambassador", "Telemarketer", "Door-to-Door Sales Agent", "Social Media Marketer", "Product Demonstrator", "Informal Street Promoter / Leaflet Distributor", "HR Officer", "Recruitment Agent", "Talent Scout", "Training & Development Officer", "Career Coach", "CV Writer / Interview Coach", "Business Consultant", "Project Manager", "Operations Manager", "Strategy Consultant", "Informal Business Advisor / Mentor", "Start-up Coach", "Lawyer / Attorney", "Paralegal", "Compliance Officer", "Contract Drafting Clerk", "Debt Collector (Formal / Informal)", "Notary Public", "Procurement Officer", "Inventory Controller", "Stock Clerk", "Warehouse Assistant", "Courier / Delivery Driver", "Informal Supply Runner", "Import/Export Coordinator", "IT Support Technician", "Web Developer", "App Developer", "Graphic Designer (Business Focus)", "Digital Marketing Specialist", "Data Analyst", "SEO Specialist", "Corporate Trainer", "Business Skills Facilitator", "Computer Skills Instructor", "Language Tutor (Business English, etc.)", "Informal Skills Coach", "Auditor", "Valuator (Property, Assets)", "Business Researcher", "Feasibility Study Consultant", "Tender/Bid Writer", "Quality Assurance Officer"].map(j => ({name: j, imagePath: ''})) },
    { name: "Security jobs", types: ["Skilled (blue-collar)", "Formal", "Permanent"], jobs: ["Bodyguard / Close Protection Officer", "Executive Protection Agent", "Celebrity Protection Specialist", "VIP Escort Security", "Personal Security Driver", "Security Guard (static)", "Mobile Patrol Officer", "Building / Office Security Officer", "Shopping Mall Security", "Bank Security Office", "Reception Security / Front Desk Officer", "Industrial / Warehouse Security", "Bouncer / Door Supervisor", "Concert Security Officer", "Festival Security", "Sports Event Security", "Crowd Control Officer", "Ticket Check Security", "Armed Security Office", "K9 Security Handler", "Maritime Security Officer", "Aviation Security Officer", "Cash-in-Transit (CIT) Office", "Escort Convoy Security", "High-Risk Area Security", "CCTV Surveillance Operator", "Control Room Operator", "Alarm Monitoring Officer", "Loss Prevention Officer", "Security Systems Operator", "Corporate Security Officer", "Government Building Security", "Diplomatic Protection Agent", "Campus / School Security Officer", "Hospital Security Officer", "Military Security Specialist", "Quick Response Team (QRT) Officer", "Riot Control Officer", "Fire & Safety Security Officer", "Search & Rescue Security", "Disaster Response Security"].map(j => ({name: j, imagePath: ''})) },
    { name: "Special needs Jobs", types: ["Semi-skilled trades", "Informal", "Formal"], jobs: ["Translator (local languages)", "Sign language interpreter", "Disabled person assistant"].map(j => ({name: j, imagePath: ''})) },
    { name: "Errands jobs", types: ["Unskilled odd jobs", "Informal", "Temporary"], jobs: ["Shopping & Delivery", "Pick-Up & Drop-Off", "Document & Admin", "Home & Household", "Event & Occasion", "Health & Wellness", "Transport-Related", "Other & Miscellaneous"].map(j => ({name: j, imagePath: ''})) },
    { name: "I.T jobs", types: ["Formal", "Skilled (blue-collar)"], jobs: ["IT Support Technician", "Web Developer", "App Developer", "Data Analyst", "SEO Specialist", "Network Administrator", "Database Administrator", "Cybersecurity Analyst"].map(j => ({name: j, imagePath: ''})) },
    { name: "Tourism jobs", types: ["Formal", "Informal", "Creative talent"], jobs: ["Tour Guide", "Hotel Receptionist", "Safari Driver", "Lodge Manager", "Chef", "Housekeeper (Hospitality)", "Travel Consultant"].map(j => ({name: j, imagePath: ''})) },
    { name: "Cleaning jobs", types: ["Unskilled odd jobs", "Informal"], jobs: ["Office Cleaner", "Industrial Cleaner", "Residential Cleaner", "Window Cleaner", "Carpet Cleaner", "Street Sweeper"].map(j => ({name: j, imagePath: ''})) },
    { name: "Seamstress jobs", types: ["Semi-skilled trades", "Informal"], jobs: ["Tailoring & Alterations", "Dressmaking", "Curtain Making", "Upholstery Sewing", "Industrial Sewing Machine Operator"].map(j => ({name: j, imagePath: ''})) },
    { name: "Miscellaneous", types: ["Unskilled odd jobs", "Informal", "Temporary", "Formal"], jobs: ["General", "Other"].map(j => ({name: j, imagePath: ''})) }
];

module.exports = { users, profiles, jobs, agencies, jobCategoryData };
