
// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Your web app's Firebase configuration
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
    apiKey: "AIzaSyCMtWMUdOATut9iXI7jRLFqZfgG38Wk_As",
    authDomain: "shadowguideapp.firebaseapp.com",
    projectId: "shadowguideapp",
    storageBucket: "shadowguideapp.firebasestorage.app",
    messagingSenderId: "630618317054",
    appId: "1:630618317054:web:1c38098231bbc24d45c5af",
    measurementId: "G-CVCGG4NWBV"
    };

    // 2. Get your Google Cloud Translation API Key.
    const GOOGLE_TRANSLATE_API_KEY = "AIzaSyCZCAQG4ZK-R6gt3FIMvHthiVpeHw64j-0";

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    let userId = null;
    const appId = 'shadow-guide-app'; // Simplified App ID


    // DOM Elements
    const mainContent = document.getElementById('mainContent');
    const nav = document.querySelector('nav');
    const navLinks = document.querySelectorAll('.nav-link');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const userIdDisplay = document.getElementById('userIdDisplay');
    const signOutButton = document.getElementById('signOutButton');
    const langSwitcher = document.getElementById('lang-switcher');


    // --- I18N & TRANSLATIONS ---
    const translationsCache = {
        en: {} // English is the source, no need to fetch.
    };
    let currentLang = localStorage.getItem('shadow-guide-lang') || 'en';

    // Store original English text on first load
    function cacheInitialEnglishText() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (!translationsCache.en[key]) {
                 translationsCache.en[key] = el.innerHTML;
            }
        });

        // Cache placeholder text
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (!translationsCache.en[key]) {
                translationsCache.en[key] = el.getAttribute('placeholder');
            }
        });
    }
    async function translateText(texts, targetLang) {
        if (!GOOGLE_TRANSLATE_API_KEY || GOOGLE_TRANSLATE_API_KEY === "YOUR_GOOGLE_TRANSLATE_API_KEY") {
            console.error("Google Translate API Key is missing.");
            return texts.map(() => `[Translation API Key Missing]`);
        }
        const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: texts,
                    target: targetLang,
                    format: 'text'
                }),
            });
            const data = await response.json();
            if (data.error) {
                // HIGHLIGHT: More detailed error logging
                console.error('Google Translate API Error:', data.error.message);
                console.error('This is often caused by API key restrictions. Make sure you have authorized your domain (e.g., localhost) in the Google Cloud Console for this API key.');
                throw new Error(data.error.message);
            }
            return data.data.translations.map(t => t.translatedText);
        } catch (error) {
            console.error('Translation API error:', error);
            return texts.map(() => `[Translation Error]`);
        }
    }

    async function setLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('shadow-guide-lang', lang);
        document.documentElement.lang = lang;

        const elementsToTranslate = Array.from(document.querySelectorAll('[data-i18n], [data-i18n-placeholder]'));        
        if (lang === 'en') {
            elementsToTranslate.forEach(el => {
                const key = el.getAttribute('data-i18n');
                const placeholderKey = el.getAttribute('data-i18n-placeholder');
                if (key && translationsCache.en[key]) {
                el.innerHTML = translationsCache.en[key];
            }
                if (placeholderKey && translationsCache.en[placeholderKey]) {
                    el.setAttribute('placeholder', translationsCache.en[placeholderKey]);
                }
            });
        } else {
            if (!translationsCache[lang]) {
                translationsCache[lang] = {};
            }

            const textsToFetch = [];
            const keysToFetch = [];

            elementsToTranslate.forEach(el => {
                const key = el.getAttribute('data-i18n') || el.getAttribute('data-i18n-placeholder');

                if (!translationsCache[lang][key]) {
                    textsToFetch.push(translationsCache.en[key]);
                    keysToFetch.push(key);
                }
            });

            if (textsToFetch.length > 0) {
                loadingIndicator.classList.remove('hidden');
                const translatedTexts = await translateText(textsToFetch, lang);
                loadingIndicator.classList.add('hidden');
                
                keysToFetch.forEach((key, index) => {
                    translationsCache[lang][key] = translatedTexts[index];
                });
            }

            elementsToTranslate.forEach(el => {
                const key = el.getAttribute('data-i18n');
                const placeholderKey = el.getAttribute('data-i18n-placeholder');
                if (key && translationsCache[lang][key]) {
                el.innerHTML = translationsCache[lang][key];
            }
                if (placeholderKey && translationsCache[lang][placeholderKey]) {
                    el.setAttribute('placeholder', translationsCache[lang][placeholderKey]);
                }
            });
        }

        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.lang === lang) {
                btn.classList.add('active');
            }
        });
    }



    //environment variable for Firebase token
    const FIREBASE_TOKEN = "1//031-bFEjtT4DQCgYIARAAGAMSNwF-L9IrSq8xqtQjttEJJXzbKq9eklhZ4cL10MGFYwynzoCGyoRHxKedfdLuNUk1K1Dw2Wa3miE"



    // --- Authentication ---
    function initializeAuthListener() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                userId = user.uid;
                console.log("User signed in with UID:", userId);
                if (userIdDisplay) {
                    userIdDisplay.textContent = user.isAnonymous ? `Anonymous User: ${userId.substring(0,8)}...` : `User: ${user.email}`;
                }
                nav.classList.remove('hidden');
                signOutButton.classList.remove('hidden');
                navigateTo('home');
            } else {
                // User is signed out
                userId = null;
                console.log("User signed out.");
                if (userIdDisplay) userIdDisplay.textContent = 'Not Authenticated';
                nav.classList.add('hidden');
                signOutButton.classList.add('hidden');
                renderAuthPage();
            }
        });
    }

    // --- Auth Page and Handlers ---
    function renderAuthPage() {
        if (!mainContent) return;
        mainContent.innerHTML = `
            <div class="neumorphic-card-outset p-8">
                <h2 class="text-3xl font-cinzel text-orange-600 mb-6 text-center" data-i18n="joinJourney">Join Your Journey</h2>
                <div id="authError" class="text-red-600 text-center mb-4"></div>
                <form id="authForm" class="space-y-6">
                    <input type="email" id="email" placeholder="Email" class="w-full p-3 neumorphic-inset text-gray-700 focus:outline-none">
                    <input type="password" id="password" placeholder="Password (6+ characters)" class="w-full p-3 neumorphic-inset text-gray-700 focus:outline-none">
                    <div class="flex flex-col sm:flex-row gap-4">
                        <button type="button" id="loginButton" class="neumorphic-button text-gray-800 font-bold py-3 px-6 flex-1" data-i18n="login">Log In</button>
                        <button type="button" id="signUpButton" class="neumorphic-button text-gray-800 font-bold py-3 px-6 flex-1" data-i18n="signUp">Sign Up</button>
                    </div>
                </form>
                <div class="text-center my-6 text-gray-500" data-i18n="or">or</div>
                <button id="anonymousButton" class="w-full neumorphic-button-secondary text-gray-700 font-semibold py-3 px-6" data-i18n="continueAnon">Continue Anonymously</button>
            </div>
        `;

        cacheInitialEnglishText();
        setLanguage(currentLang);
        document.getElementById('loginButton').addEventListener('click', handleLogin);
        document.getElementById('signUpButton').addEventListener('click', handleSignUp);
        document.getElementById('anonymousButton').addEventListener('click', handleAnonymousSignIn);

    }

    async function handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const authError = document.getElementById('authError');
        if (!email || !password) {
            authError.textContent = 'Please enter both email and password.';
            return;
        }
        loadingIndicator.classList.remove('hidden');
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            authError.textContent = error.message;
            console.error("Login Error:", error);
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    async function handleSignUp() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const authError = document.getElementById('authError');
         if (!email || !password) {
            authError.textContent = 'Please enter both email and password.';
            return;
        }
        loadingIndicator.classList.remove('hidden');
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            authError.textContent = error.message;
            console.error("Sign Up Error:", error);
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    async function handleAnonymousSignIn() {
         loadingIndicator.classList.remove('hidden');
         try {
             await signInAnonymously(auth);
         } catch(error) {
            document.getElementById('authError').textContent = error.message;
            console.error("Anonymous Sign In Error:", error);
         } finally {
             loadingIndicator.classList.add('hidden');
         }
    }

    signOutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Sign Out Error", error);
        }
    });


    // --- Navigation ---
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.dataset.section;
            navigateTo(section);
        });
    });

    function navigateTo(section) {
        if (!mainContent) return; 
        if (!userId) {
             renderAuthPage();
             return;
        }
        loadingIndicator.classList.remove('hidden');
        mainContent.innerHTML = ''; 

        navLinks.forEach(nav => nav.classList.remove('neumorphic-nav-active', 'text-orange-600'));
        const activeLink = document.querySelector(`.nav-link[data-section="${section}"]`);
        if (activeLink) {
            activeLink.classList.add('neumorphic-nav-active', 'text-orange-600');
        }
        
        if (section === 'home') renderHomePage();
        else if (section === 'about') renderAboutPage();
        else if (section === 'journal') renderJournalPage();
        else if (section === 'exercises') renderExercisesPage();
        else if (section === 'entries') renderEntriesPage();
        else mainContent.innerHTML = `<p class="text-gray-700">Coming soon: ${section}</p>`;

        // ** FIX: Cache new English text before attempting to translate **
        cacheInitialEnglishText();
        setLanguage(currentLang);
        loadingIndicator.classList.add('hidden');
    }

    // --- Page Renderers ---
    function renderHomePage() {
        if (!mainContent) return;
        mainContent.innerHTML = `
            <div class="text-center p-8 md:p-16 neumorphic-card-outset stamp-bg relative">
                <div class="relative z-10">
                    <h1 class="text-4xl font-cinzel text-orange-600 mb-6" data-i18n="welcomeTitle">Welcome to Shadow</h1>
                    <p class="text-xl text-gray-700 mb-8" data-i18n="welcomeText">
                        Embark on a journey of self-discovery and integration. Explore the depths of your psyche, understand your shadows, and cultivate a more authentic self.
                    </p>
                    <button class="neumorphic-button text-gray-800 font-bold py-3 px-8 text-lg nav-link-button" data-section="about" data-i18n="beginJourney">
                        Begin Your Journey
                    </button>
                </div>
            </div>
        `;
        const aboutButton = mainContent.querySelector('.nav-link-button[data-section="about"]');
        if (aboutButton) {
             aboutButton.addEventListener('click', () => navigateTo('about'));
        }
    }

    function renderAboutPage() {
        if (!mainContent) return;
        mainContent.innerHTML = `
        <div class="p-6 md:p-8 neumorphic-card-outset">
                <h2 class="text-4xl font-cinzel text-orange-600 mb-6 border-b border-gray-300 pb-4" data-i18n="aboutTitle">On The Shadow</h2>
                
                <div class="mb-12">
                    <h3 class="text-3xl font-cinzel text-orange-500 mb-4" data-i18n="jungTitle">A Jungian View</h3>
                    <div class="flex flex-col md:flex-row gap-8">
                        <div class="md:w-2/3 space-y-6 text-gray-700 text-lg leading-relaxed">
                            <p data-i18n="jungText1">Shadow work is the profound process of exploring your inner darkness, or your "Shadow Self." This concept, popularized by Swiss psychiatrist Carl Jung, refers to the unconscious parts of your personality that your conscious ego doesn't identify with. These are the aspects you might repress or hide, often because they were deemed unacceptable by yourself, society, or during your upbringing.</p>
                            <p data-i18n="jungText2">The shadow isn't necessarily negative or evil; it's a natural part of being human. It can contain repressed fears, insecurities, and traumas, but also hidden talents, strengths, and creative urges. By bringing these hidden aspects into conscious awareness, you can begin to understand them, heal them, and integrate them into your whole self.</p>
                        </div>
                        <div class="md:w-1/3">
                            <img src="./Media/Yung.png" alt="Carl Jung" class="w-full h-auto rounded-2xl neumorphic-image p-2">
                            <p class="text-center text-sm text-gray-500 mt-2">Carl Jung</p>
                        </div>
                    </div>
                </div>

                 <div class="mb-12 border-t border-gray-300 pt-8">
                    <h3 class="text-3xl font-cinzel text-orange-500 mb-4" data-i18n="greeneTitle">A Pragmatic View: Robert Greene on the Shadow</h3>
                    <div class="flex flex-col md:flex-row-reverse gap-8">
                        <div class="md:w-2/3 space-y-6 text-gray-700 text-lg leading-relaxed">
                            <p data-i18n="greeneText1">Author Robert Greene frames the Shadow as a practical force in everyday human nature. In his "Law of Repression," he explains that we all wear a social mask, presenting a polite and agreeable front. Beneath this mask, however, lies a Shadow Self composed of our repressed insecurities, selfish impulses, and aggressive energies.</p>
                            <p data-i18n="greeneText2">This dark side inevitably leaks out in our behavior—often through subtle, contradictory actions, emotional outbursts, or passive-aggression. According to Greene, understanding this dynamic is not just for introspection, but is a critical skill for navigating the social world. By learning to recognize the signs of the Shadow in others, you can protect yourself from manipulation and understand people's true motivations. By confronting your own Shadow, you can control and channel its powerful energies toward productive and creative ends, becoming a more whole and authentic individual.</p>
                        </div>
                        <div class="md:w-1/3">
                            <img src="./Media/robert greene.jpg" alt="Robert Greene" class="w-full h-auto rounded-2xl neumorphic-image p-2">
                            <p class="text-center text-sm text-gray-500 mt-2">Robert Greene</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderJournalPage() {
        if (!mainContent) return;
        mainContent.innerHTML = `
            <div class="p-6 md:p-8 neumorphic-card-outset">
                <h2 class="text-4xl font-cinzel text-orange-600 mb-6" data-i18n="journalTitle">My Journal</h2>
                <div class="mb-8">
                    <label for="journalPrompt" class="block text-xl font-cinzel text-orange-500 mb-2" data-i18n="journalPromptLabel">Journal Prompt:</label>
                    <select id="journalPrompt" class="w-full p-3 neumorphic-inset text-gray-700 focus:outline-none">
                        <option value="" data-i18n="promptSelectDefault">-- Select a Preset Prompt (Optional) --</option>
                        <option value="What emotions arose for me today, and what might be their deeper source?" data-i18n="prompt1">What emotions arose for me today, and what might be their deeper source?</option>
                        <option value="Describe a recent situation where I felt triggered. What aspect of my shadow might have been activated?" data-i18n="prompt2">Describe a recent situation where I felt triggered. What aspect of my shadow might have been activated?</option>
                        <option value="If my inner child could speak to me right now, what would they say?" data-i18n="prompt3">If my inner child could speak to me right now, what would they say?</option>
                        <option value="Consider your own 'social mask.' What are the main qualities you try to project? What opposite traits might you be concealing? (R. Greene)" data-i18n="prompt4">Consider your 'social mask.' What qualities do you project vs. conceal? (R. Greene)</option>
                        <option value="Greene writes that envy often hides behind poisonous praise. Recall a compliment that felt 'off.' What might it reveal about the other person's envy? (R. Greene)" data-i18n="prompt5">Recall a 'poisonous' compliment. What envy might it hide? (R. Greene)</option>
                        <option value="Think about a recent group decision. Did you feel pressure to conform? How did the 'group mind' differ from your own private thoughts? (R. Greene)" data-i18n="prompt6">How did group pressure affect your thinking in a recent decision? (R. Greene)</option>
                    </select>
                </div>
                <textarea id="journalEntry" class="w-full h-64 p-4 neumorphic-inset text-gray-700 placeholder-gray-500 focus:outline-none" data-i18n-placeholder="journalPlaceholder" placeholder="Begin your reflections here..."></textarea>
                <button id="saveJournalEntry" class="mt-6 neumorphic-button text-gray-800 font-bold py-3 px-6" data-i18n="saveEntry">Save Entry</button>
                <div id="journalStatus" class="mt-4 text-green-600"></div>
            </div>
        `;

        const journalPromptSelect = document.getElementById('journalPrompt');
        const journalEntryTextarea = document.getElementById('journalEntry');
        
        if (journalPromptSelect && journalEntryTextarea) {
            journalPromptSelect.addEventListener('change', (e) => {
                if (e.target.value && journalEntryTextarea.value.trim() === '') {
                    journalEntryTextarea.value = `Prompt: ${e.target.value}\n\n`;
                } else if (e.target.value) {
                     journalEntryTextarea.value = `Prompt: ${e.target.value}\n\n${journalEntryTextarea.value.split('\n\n').slice(1).join('\n\n')}`;
                }
            });
        }

        document.getElementById('saveJournalEntry').addEventListener('click', saveJournalEntry);
    }

    async function saveJournalEntry() {
        const journalStatus = document.getElementById('journalStatus');
        const journalEntry = document.getElementById('journalEntry');
        const journalPrompt = document.getElementById('journalPrompt');

        if (!journalStatus || !journalEntry || !journalPrompt) return;

        if (!userId) {
            journalStatus.textContent = 'Error: Not authenticated.';
            journalStatus.classList.remove('text-green-600');
            journalStatus.classList.add('text-red-700');
            return;
        }
        const entryText = journalEntry.value.trim();
        const promptText = journalPrompt.value;

        if (entryText === "") {
            journalStatus.textContent = 'Entry cannot be empty.';
            journalStatus.classList.remove('text-green-600');
            journalStatus.classList.add('text-red-700');
            return;
        }

        loadingIndicator.classList.remove('hidden');
        journalStatus.textContent = '';

        try {
            const entryData = {
                userId: userId,
                text: entryText,
                prompt: promptText || "Free-form",
                timestamp: Timestamp.now(),
                appId: appId
            };
            const collectionPath = `artifacts/${appId}/users/${userId}/journalEntries`;
            await addDoc(collection(db, collectionPath), entryData);
            
            journalStatus.textContent = 'Entry saved successfully!';
            journalStatus.classList.remove('text-red-700');
            journalStatus.classList.add('text-green-600');
            journalEntry.value = '';
            journalPrompt.value = '';
        } catch (error) {
            console.error("Error saving journal entry: ", error);
            journalStatus.textContent = 'Failed to save entry. See console for details.';
            journalStatus.classList.remove('text-green-600');
            journalStatus.classList.add('text-red-700');
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }


    function renderExercisesPage() {
        if (!mainContent) return;
        mainContent.innerHTML = `
            <div class="p-6 md:p-8 neumorphic-card-outset">
                <h2 class="text-4xl font-cinzel text-orange-600 mb-8" data-i18n="exercisesTitle">Shadow Work Exercises</h2>
                <div class="space-y-10">
                    ${renderExerciseCard("Getting to the Root", "Identify and process triggers in real-time.", "root_exercise")}
                    ${renderExerciseCard("Inner Child Connection", "Acknowledge and nurture your inner child.", "inner_child_exercise")}
                    ${renderExerciseCard("The Law of Repression", "Decode the shadow in others and yourself, based on Robert Greene's principles.", "greene_repression_exercise")}
                    ${renderExerciseCard("EFT Tapping - Basic Setup", "Learn the Emotional Freedom Technique setup statement.", "eft_setup_exercise")}
                    ${renderExerciseCard("Simple Grounding Technique", "Center yourself and connect to the present moment.", "grounding_exercise")}
                </div>
            </div>
        `;
        document.querySelectorAll('.exercise-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const exerciseId = e.target.dataset.exercise;
                renderExerciseDetail(exerciseId);
            });
        });
    }

    // --- Render Exercise Card --- Doesn't have data-i18n because it's dynamic and connected to renderExercisesPage()
    function renderExerciseCard(title, description, exerciseId) {
        // Use a unique key for the button text to avoid conflicts
        const buttonkey = `beginExercise-${exerciseId}`;
        return `
            <div class="neumorphic-card-outset p-6">
                <h3 class="text-2xl font-cinzel text-orange-500 mb-3" data-i18n="${title}">${translationsCache.en[title] || title}</h3>
                <p class="text-gray-600 mb-4" data-i18n="${description}">${translationsCache.en[description] || description}</p>
                <button class="exercise-btn neumorphic-button text-gray-800 font-semibold py-2 px-4" data-exercise="${exerciseId}" data-i18n="${buttonkey}">Begin Exercise</button>
            </div>
        `;
    }

    // --- Render Exercise Detail (Main Logic) ---
    function renderExerciseDetail(exerciseId) {
        if (!mainContent) return;
        loadingIndicator.classList.remove('hidden');
        let exerciseContentHTML = ''; 
        
        if (exerciseId === 'root_exercise') exerciseContentHTML = getRootExerciseHTML();
        else if (exerciseId === 'grounding_exercise') exerciseContentHTML = getGroundingExerciseHTML();
        else if (exerciseId === 'inner_child_exercise') exerciseContentHTML = getInnerChildExerciseHTML();
        else if (exerciseId === 'eft_setup_exercise') exerciseContentHTML = getEftExerciseHTML();
        else if (exerciseId === 'greene_repression_exercise') exerciseContentHTML = getGreeneRepressionHTML();
        else exerciseContentHTML = `<p class="text-gray-700">Exercise not found.${exerciseId}</p>`;

        mainContent.innerHTML = `<div class="p-6 md:p-8 neumorphic-card-outset">${exerciseContentHTML}</div>`;
        
        const backButton = mainContent.querySelector('.back-to-exercises');
        if (backButton) backButton.addEventListener('click', renderExercisesPage);

        const rootForm = document.getElementById('rootExerciseForm');
        if (rootForm) rootForm.addEventListener('submit', (e) => handleExerciseSubmit(e, 'rootExerciseForm', 'Getting to the Root'));

        const innerChildForm = document.getElementById('innerChildExerciseForm');
        if (innerChildForm) innerChildForm.addEventListener('submit', (e) => handleExerciseSubmit(e, 'innerChildExerciseForm', 'Inner Child Connection'));

        const greeneForm = document.getElementById('greeneRepressionForm');
        if (greeneForm) greeneForm.addEventListener('submit', (e) => handleExerciseSubmit(e, 'greeneRepressionForm', 'The Law of Repression'));
        
        loadingIndicator.classList.add('hidden');
    }

    // --- Exercise HTML Generators ---
function getRootExerciseHTML() {
    return `
        <h3 class="text-3xl font-cinzel text-orange-600 mb-6" data-i18n="rootTitle">Getting to the Root</h3>
        <p class="text-gray-700 mb-6" data-i18n="rootDesc">When you notice yourself becoming irritated, anxious, angry, or sad, use these prompts to explore the underlying cause:</p>
        <form id="rootExerciseForm" class="space-y-6">
            <div>
                <label for="trigger" class="block text-xl font-cinzel text-orange-500 mb-2" data-i18n="rootQ1">1. What is triggering my shadow right now?</label>
                <textarea name="trigger" class="w-full p-3 neumorphic-inset text-gray-700 h-24 focus:outline-none" placeholder="Describe the situation, person, or event..."></textarea>
            </div>
            <div>
                <label for="thoughts" class="block text-xl font-cinzel text-orange-500 mb-2" data-i18n="rootQ2">2. What thoughts am I having?</label>
                <textarea name="thoughts" class="w-full p-3 neumorphic-inset text-gray-700 h-24 focus:outline-none" placeholder="List the thoughts, judgments, or assumptions..."></textarea>
            </div>
            <div>
                <label for="emotions" class="block text-xl font-cinzel text-orange-500 mb-2" data-i18n="rootQ3">3. What emotions am I experiencing?</label>
                <textarea name="emotions" class="w-full p-3 neumorphic-inset text-gray-700 h-24 focus:outline-none" placeholder="Name the feelings (e.g., anger, sadness, fear, shame)..."></textarea>
            </div>
            <button type="submit" class="neumorphic-button text-gray-800 font-bold py-3 px-6" data-i18n="saveReflection">Save Reflection</button>
            <div id="exerciseStatus" class="mt-4 text-green-600"></div>
        </form>
        <button class="back-to-exercises mt-6 neumorphic-button-secondary text-gray-700 font-semibold py-2 px-4" data-i18n="backToExercises">Back to Exercises</button>
    `;
}

function getInnerChildExerciseHTML() {
    return `
        <h3 class="text-3xl font-cinzel text-orange-600 mb-6" data-i18n="icTitle">Inner Child Connection</h3>
        <p class="text-gray-700 mb-6" data-i18n="icDesc">This exercise is about acknowledging and offering compassion to your inner child. Find a quiet space where you won't be disturbed.</p>
        <form id="innerChildExerciseForm" class="space-y-6">
            <div>
                <p class="text-xl font-cinzel text-orange-500 mb-2" data-i18n="icQ1">1. Visualize Your Inner Child</p>
                <textarea name="visualization" class="w-full p-3 neumorphic-inset text-gray-700 h-20 focus:outline-none" placeholder="Describe your inner child..."></textarea>
            </div>
            <div>
                <label for="needs" class="block text-xl font-cinzel text-orange-500 mb-2" data-i18n="icQ2">2. What does your inner child need from you right now?</label>
                <textarea name="needs" class="w-full p-3 neumorphic-inset text-gray-700 h-20 focus:outline-none" placeholder="My inner child needs..."></textarea>
            </div>
            <div>
                <label for="affirmation" class="block text-xl font-cinzel text-orange-500 mb-2" data-i18n="icQ3">3. Offer an Affirmation or Message</label>
                <textarea name="affirmation" class="w-full p-3 neumorphic-inset text-gray-700 h-24 focus:outline-none" placeholder="Example: 'You are safe. You are loved. It's okay to feel what you feel.'"></textarea>
            </div>
            <button type="submit" class="neumorphic-button text-gray-800 font-bold py-3 px-6" data-i18n="saveReflection">Save Reflection</button>
            <div id="exerciseStatus" class="mt-4 text-green-600"></div>
        </form>
        <button class="back-to-exercises mt-6 neumorphic-button-secondary text-gray-700 font-semibold py-2 px-4" data-i18n="backToExercises">Back to Exercises</button>
    `;
}

function getGreeneRepressionHTML() {
    return `
        <h3 class="text-3xl font-cinzel text-orange-600 mb-6" data-i18n="greeneTitle">The Law of Repression: A Greene Perspective</h3>
        <p class="text-gray-700 mb-8 text-lg leading-relaxed" data-i18n="greeneDesc">Based on Robert Greene's "The Laws of Human Nature," this exercise helps you decode the Shadow by observing behaviors that leak repressed feelings. Use this to analyze others or yourself.</p>
        <form id="greeneRepressionForm" class="space-y-10">
            <div class="neumorphic-inset-darker p-6 rounded-xl">
                <h4 class="text-2xl font-cinzel text-orange-600 mb-4" data-i18n="greenePart1Title">Part 1: Recognizing the Signs</h4>
                <div class="space-y-6">
                    <div>
                        <label for="contradictory_behavior" class="block text-xl font-cinzel text-orange-500 mb-2" data-i18n="greeneContradictoryLabel">Contradictory Behavior</label>
                        <p class="text-sm text-gray-600 mb-2" data-i18n="greeneContradictoryDesc">Think of someone (or yourself) who projects a very strong trait (e.g., extreme toughness, kindness, morality). Describe a time they behaved in a way that completely contradicted this front.</p>
                        <textarea name="contradictory_behavior" class="w-full p-3 neumorphic-inset text-gray-700 h-24 focus:outline-none"></textarea>
                    </div>
                    <div>
                        <label for="emotional_outburst" class="block text-xl font-cinzel text-orange-500 mb-2" data-i18n="greeneOutburstLabel">Emotional Outbursts</label>
                        <p class="text-sm text-gray-600 mb-2" data-i18n="greeneOutburstDesc">Describe a moment when someone had a disproportionate emotional reaction. What might the outburst have revealed about their repressed feelings?</p>
                        <textarea name="emotional_outburst" class="w-full p-3 neumorphic-inset text-gray-700 h-24 focus:outline-none"></textarea>
                    </div>
                    <div>
                        <label for="projection" class="block text-xl font-cinzel text-orange-500 mb-2" data-i18n="greeneProjectionLabel">Projection</label>
                        <p class="text-sm text-gray-600 mb-2" data-i18n="greeneProjectionDesc">Think about a quality someone constantly criticizes in others. Could this be a projection of a desire or insecurity they can't admit in themselves?</p>
                        <textarea name="projection" class="w-full p-3 neumorphic-inset text-gray-700 h-24 focus:outline-none"></textarea>
                    </div>
                </div>
            </div>
            <div class="neumorphic-inset-darker p-6 rounded-xl">
                <h4 class="text-2xl font-cinzel text-orange-600 mb-4" data-i18n="greenePart2Title">Part 2: Shadow Archetypes</h4>
                <p class="text-gray-700 mb-6" data-i18n="greenePart2Desc">Reflect on people you know (or yourself) who might fit these archetypes.</p>
                <details class="mb-4">
                    <summary class="cursor-pointer text-xl font-cinzel text-orange-500" data-i18n="greeneToughGuySummary">The Tough Guy</summary>
                    <div class="p-4 mt-2 neumorphic-inset">
                        <p class="text-gray-600 mb-2" data-i18n="greeneToughGuyDesc">Covers underlying softness and insecurity with a rough exterior. Have you glimpsed moments of vulnerability behind the tough mask?</p>
                        <textarea name="archetype_tough_guy" class="w-full p-2 neumorphic-inset text-gray-700 h-20 focus:outline-none"></textarea>
                    </div>
                </details>
                <details class="mb-4">
                    <summary class="cursor-pointer text-xl font-cinzel text-orange-500" data-i18n="greeneSaintSummary">The Saint</summary>
                    <div class="p-4 mt-2 neumorphic-inset">
                        <p class="text-gray-600 mb-2" data-i18n="greeneSaintDesc">Uses a show of moral purity to disguise a hunger for power or sensual appetites. Do their actions always match their words?</p>
                        <textarea name="archetype_saint" class="w-full p-2 neumorphic-inset text-gray-700 h-20 focus:outline-none"></textarea>
                    </div>
                </details>
                <details class="mb-4">
                    <summary class="cursor-pointer text-xl font-cinzel text-orange-500" data-i18n="greeneCharmerSummary">The Passive-Aggressive Charmer</summary>
                    <div class="p-4 mt-2 neumorphic-inset">
                        <p class="text-gray-600 mb-2" data-i18n="greeneCharmerDesc">Uses excessive niceness as a defense, with resentment leaking out through subtle digs or sabotage. Have you seen this pattern?</p>
                        <textarea name="archetype_charmer" class="w-full p-2 neumorphic-inset text-gray-700 h-20 focus:outline-none"></textarea>
                    </div>
                </details>
            </div>
            <button type="submit" class="neumorphic-button text-gray-800 font-bold py-3 px-6" data-i18n="saveReflection">Save Reflection</button>
            <div id="exerciseStatus" class="mt-4 text-green-600"></div>
        </form>
        <button class="back-to-exercises mt-6 neumorphic-button-secondary text-gray-700 font-semibold py-2 px-4" data-i18n="backToExercises">Back to Exercises</button>
    `;
}

function getEftExerciseHTML() {
    return `
        <h3 class="text-3xl font-cinzel text-orange-600 mb-6" data-i18n="eftTitle">EFT Tapping - Basic Setup</h3>
        <div class="flex flex-col md:flex-row gap-8 items-start">
            <div class="md:w-2/3 text-gray-700 space-y-4 text-lg leading-relaxed">
                <p data-i18n="eftDesc1">Emotional Freedom Technique (EFT), or tapping, combines acupressure with modern psychology. The "Setup Statement" is the first step and acknowledges the issue while affirming self-acceptance.</p>
                <p><strong data-i18n="eftStep1">1. Identify the Problem:</strong> Clearly define the issue you want to work on. This could be an emotion (anxiety), a physical discomfort, or a limiting belief ("I'm not good enough").</p>
                <p><strong data-i18n="eftStep2">2. Rate the Intensity:</strong> On a scale of 0 to 10 (where 10 is the highest), how strong is this feeling or belief right now?</p>
                <p><strong data-i18n="eftStep3">3. Create Your Setup Statement:</strong> The standard format is:</p>
                <p class="italic p-4 neumorphic-inset-darker rounded-md" data-i18n="eftQuote">"Even though I have this [problem/issue/feeling], I deeply and completely accept myself."</p>
                <p><strong data-i18n="eftHowTo">How to Use It:</strong> While gently and continuously tapping on the "Karate Chop" point (shown in the diagram), repeat your Setup Statement three times with feeling. This prepares you for the full tapping sequence.</p>
            </div>
            <div class="md:w-1/3 mt-4 md:mt-0">
                <img src="https://storage.googleapis.com/project-1234-files/ETF%20taping.jpg-24d48d5f-c9bc-4bdb-acc0-b6ff2e189b74" alt="EFT Tapping Points Diagram" class="w-full h-auto rounded-2xl neumorphic-image p-2">
            </div>
        </div>
        <button class="back-to-exercises mt-8 neumorphic-button-secondary text-gray-700 font-semibold py-2 px-4" data-i18n="backToExercises">Back to Exercises</button>
    `;
}

function getGroundingExerciseHTML() {
    return `
        <h3 class="text-3xl font-cinzel text-orange-600 mb-6" data-i18n="groundingTitle">Simple Grounding Technique (5-4-3-2-1 Method)</h3>
        <div class="text-gray-700 space-y-4 text-lg leading-relaxed">
            <p data-i18n="groundingDesc1">This technique helps you connect with the present moment by engaging your senses. Find a comfortable position, either sitting or standing.</p>
            <p><strong data-i18n="groundingDesc2">Take a few deep breaths to begin.</strong> Inhale slowly through your nose, feel your abdomen expand, and exhale slowly through your mouth.</p>
            <p data-i18n="groundingDesc3">Now, silently or aloud, acknowledge:</p>
            <ul class="list-disc list-inside space-y-3 pl-4 text-gray-600">
                <li data-i18n="groundingSee"><strong>5 things you can SEE:</strong> Look around you and notice five distinct objects.</li>
                <li data-i18n="groundingFeel"><strong>4 things you can FEEL:</strong> Bring your attention to physical sensations.</li>
                <li data-i18n="groundingHear"><strong>3 things you can HEAR:</strong> Listen carefully to the sounds around you.</li>
                <li data-i18n="groundingSmell"><strong>2 things you can SMELL:</strong> Notice any scents in the air.</li>
                <li data-i18n="groundingTaste"><strong>1 thing you can TASTE:</strong> Focus on the taste in your mouth.</li>
            </ul>
            <p data-i18n="groundingEnd">End with another deep breath. Notice how you feel. This exercise can be done anywhere, anytime you feel overwhelmed or disconnected.</p>
        </div>
        <button class="back-to-exercises mt-8 neumorphic-button-secondary text-gray-700 font-semibold py-2 px-4" data-i18n="backToExercises">Back to Exercises</button>
    `;
}

    // --- Exercise Form Handling ---
    function handleExerciseSubmit(event, formId, exerciseTitle) {
        event.preventDefault();
        const form = document.getElementById(formId);
        if (!form) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        const cleanData = {};
        for (const key in data) {
            if (data[key].trim() !== '') {
                cleanData[key] = data[key];
            }
        }
        
        if (Object.keys(cleanData).length > 0) {
             saveExerciseResponse(exerciseTitle, cleanData, formId);
        } else {
            const statusElement = form.querySelector('#exerciseStatus');
            if (statusElement) {
                statusElement.textContent = 'Please fill out at least one field to save.';
                statusElement.className = 'mt-4 text-red-700';
            }
        }
    }


    async function saveExerciseResponse(exerciseTitle, data, formId) {
        const form = document.getElementById(formId);
        const exerciseStatusElement = form ? form.querySelector('#exerciseStatus') : null; 

        if (!userId) {
            if (exerciseStatusElement) {
                exerciseStatusElement.textContent = 'Error: Not authenticated.';
                exerciseStatusElement.classList.remove('text-green-600');
                exerciseStatusElement.classList.add('text-red-700');
            }
            return;
        }
        loadingIndicator.classList.remove('hidden');
        if (exerciseStatusElement) {
            exerciseStatusElement.textContent = ''; 
        }

        try {
            const responseData = {
                userId: userId,
                exerciseTitle: exerciseTitle,
                data: data, 
                timestamp: Timestamp.now(),
                appId: appId
            };
            const collectionPath = `artifacts/${appId}/users/${userId}/exerciseResponses`;
            await addDoc(collection(db, collectionPath), responseData);
            
            if (exerciseStatusElement) {
                exerciseStatusElement.textContent = 'Reflection saved successfully!';
                exerciseStatusElement.classList.remove('text-red-700');
                exerciseStatusElement.classList.add('text-green-600');
            }
            
            if (formId) { 
                const formToReset = document.getElementById(formId);
                if (formToReset) {
                    formToReset.reset();
                }
            }

        } catch (error) {
            console.error("Error saving exercise response: ", error);
            if (exerciseStatusElement) {
                exerciseStatusElement.textContent = 'Failed to save reflection. See console for details.';
                exerciseStatusElement.classList.remove('text-green-600');
                exerciseStatusElement.classList.add('text-red-700');
            }
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    async function renderEntriesPage() {
        if (!mainContent) return;
        if (!userId) {
             mainContent.innerHTML = `<p class="text-orange-700 text-center py-10">Please sign in to view your entries.</p>`;
             return;
        }
        loadingIndicator.classList.remove('hidden');
        mainContent.innerHTML = `<div class="p-6 md:p-8 neumorphic-card-outset"><h2 class="text-4xl font-cinzel text-orange-600 mb-6" data-i18n="msaved">My Saved Entries</h2><div id="entriesList" class="space-y-6"></div></div>`;
        const entriesList = document.getElementById('entriesList');
        if (!entriesList) return; 

        try {
            const journalCollectionPath = `artifacts/${appId}/users/${userId}/journalEntries`;
            const journalQuery = query(collection(db, journalCollectionPath), orderBy("timestamp", "desc"));
            const journalSnapshot = await getDocs(journalQuery);
            
            let hasContent = false;
            if (!journalSnapshot.empty) {
                hasContent = true;
                entriesList.innerHTML += '<h3 class="text-2xl font-cinzel text-orange-500 mt-4 mb-2">Journal Entries</h3>';
                journalSnapshot.forEach(doc => {
                    const entry = doc.data();
                    const entryDiv = document.createElement('div');
                    entryDiv.className = 'neumorphic-card-outset p-4';
                    const sanitizedText = entry.text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
                    const promptDisplay = entry.prompt === "Free-form" ? "Free-form" : "Prompt: " + entry.prompt.replace(/</g, "&lt;").replace(/>/g, "&gt;");

                    entryDiv.innerHTML = `
                        <p class="text-sm text-orange-500 font-semibold">${entry.timestamp.toDate().toLocaleString()} - ${promptDisplay}</p>
                        <p class="text-gray-600 whitespace-pre-wrap mt-2">${sanitizedText}</p>
                    `;
                    entriesList.appendChild(entryDiv);
                });
            }

            const exerciseCollectionPath = `artifacts/${appId}/users/${userId}/exerciseResponses`;
            const exerciseQuery = query(collection(db, exerciseCollectionPath), orderBy("timestamp", "desc"));
            const exerciseSnapshot = await getDocs(exerciseQuery);

            if (!exerciseSnapshot.empty) {
                hasContent = true;
                entriesList.innerHTML += '<h3 class="text-2xl font-cinzel text-orange-500 mt-8 mb-2">Exercise Reflections</h3>';
                 exerciseSnapshot.forEach(doc => {
                    const response = doc.data();
                    const responseDiv = document.createElement('div');
                    responseDiv.className = 'neumorphic-card-outset p-4';
                    let dataHtml = '<ul class="list-disc list-inside pl-4 mt-2 space-y-1">';
                    for (const key in response.data) {
                        const sanitizedKey = key.replace(/_/g, ' ').replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        const sanitizedValue = String(response.data[key]).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
                        dataHtml += `<li class="text-gray-600"><strong class="text-orange-400 capitalize">${sanitizedKey}:</strong> ${sanitizedValue}</li>`;
                    }
                    dataHtml += '</ul>';
                    responseDiv.innerHTML = `
                        <p class="text-sm text-orange-500 font-semibold">${response.timestamp.toDate().toLocaleString()} - ${response.exerciseTitle.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                        ${dataHtml}
                    `;
                    entriesList.appendChild(responseDiv);
                });
            }

            if (!hasContent) {
                entriesList.innerHTML = '<p class="text-gray-600">No journal entries or exercise reflections found.</p>';
            }


        } catch (error) {
            console.error("Error fetching entries: ", error);
            entriesList.innerHTML = '<p class="text-red-700">Error fetching entries. See console.</p>';
        } finally {
            loadingIndicator.classList.add('hidden');
        }
    }

    // --- Initial Setup ---
    langSwitcher.addEventListener('click', (e) => {
        if (e.target.classList.contains('lang-btn')) {
            setLanguage(e.target.dataset.lang);
        }
    });
    
    // Initial load
    cacheInitialEnglishText();
    initializeAuthListener();
});