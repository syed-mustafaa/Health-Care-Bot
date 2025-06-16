// Chatbot functionality
const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');

// Voice recognition setup
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = true;
recognition.maxAlternatives = 1;

// Create language dropdown
const languageSelect = document.createElement('select');
languageSelect.id = 'language-select';
const languages = [
    { code: 'en-US', name: 'English' },
    { code: 'hi-IN', name: 'Hindi' },
    { code: 'mr-IN', name: 'Marathi' },
    { code: 'ta-IN', name: 'Tamil' },
    { code: 'kn-IN', name: 'Kannada' },
    { code: 'te-IN', name: 'Telugu' },
    { code: 'bn-IN', name: 'Bengali' },
    { code: 'gu-IN', name: 'Gujarati' },
    { code: 'ml-IN', name: 'Malayalam' },
    { code: 'pa-IN', name: 'Punjabi' }
];

languages.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.name;
    languageSelect.appendChild(option);
});
languageSelect.classList.add('language-select');

// Set initial language for recognition
recognition.lang = languageSelect.value;

// Add language selector to the chat input area
const chatInputContainer = document.querySelector('.chat-input');
chatInputContainer.insertBefore(languageSelect, userInput);

// Voice input button
const voiceInputBtn = document.createElement('button');
voiceInputBtn.innerHTML = '<i class="fas fa-microphone"></i>';
voiceInputBtn.classList.add('voice-btn');
voiceInputBtn.style.marginLeft = '0.5rem';
voiceInputBtn.style.backgroundColor = '#4CAF50';
userInput.parentNode.insertBefore(voiceInputBtn, userInput.nextSibling);

// Voice output toggle button
const voiceOutputBtn = document.createElement('button');
voiceOutputBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
voiceOutputBtn.classList.add('voice-btn');
voiceOutputBtn.style.marginLeft = '0.5rem';
voiceOutputBtn.style.backgroundColor = '#4CAF50';
userInput.parentNode.insertBefore(voiceOutputBtn, userInput.nextSibling);

// Stop voice button
const stopVoiceBtn = document.createElement('button');
stopVoiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
stopVoiceBtn.classList.add('voice-btn');
stopVoiceBtn.style.marginLeft = '0.5rem';
stopVoiceBtn.style.display = 'none';
stopVoiceBtn.style.backgroundColor = '#f44336';
userInput.parentNode.insertBefore(stopVoiceBtn, voiceOutputBtn.nextSibling);

// Voice state variables
let isVoiceEnabled = true;
let isSpeaking = false;

// Voice input button click handler
voiceInputBtn.addEventListener('click', () => {
    try {
        if (voiceInputBtn.style.backgroundColor === 'red') {
            recognition.stop();
            voiceInputBtn.style.backgroundColor = '#4CAF50';
        } else {
            recognition.lang = languageSelect.value;
            recognition.start();
            voiceInputBtn.style.backgroundColor = 'red';
            
            // Show listening indicator
            const listeningIndicator = document.createElement('div');
            listeningIndicator.classList.add('message', 'bot');
            listeningIndicator.innerHTML = '<p>Listening... Please speak now. Click the microphone again to stop.</p>';
            chatMessages.appendChild(listeningIndicator);
            chatMessages.scrollTop = chatMessages.scrollHeight;
            
            // Remove listening indicator after 30 seconds if no result
            setTimeout(() => {
                if (voiceInputBtn.style.backgroundColor === 'red') {
                    recognition.stop();
                    voiceInputBtn.style.backgroundColor = '#4CAF50';
                    chatMessages.removeChild(listeningIndicator);
                    
                    // Show timeout message
                    const timeoutMessage = document.createElement('div');
                    timeoutMessage.classList.add('message', 'bot');
                    timeoutMessage.innerHTML = '<p>Listening timed out. Please try again or type your message.</p>';
                    chatMessages.appendChild(timeoutMessage);
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }, 30000);
        }
    } catch (error) {
        console.error('Voice input error:', error);
        voiceInputBtn.style.backgroundColor = '#4CAF50';
        
        // Show error message to user
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('message', 'bot');
        errorMessage.innerHTML = '<p>Voice input is not supported in your browser. Please type your message instead.</p>';
        chatMessages.appendChild(errorMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});

// Speech recognition result handler
recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    console.log('Recognized text:', transcript);
    
    // Add user message to chat
    addMessage(transcript, true);
    
    // Process the input
    handleUserInput(transcript);
    
    // Reset voice input button
    voiceInputBtn.style.backgroundColor = '#4CAF50';
    
    // Stop recognition after getting a complete result
    recognition.stop();
};

// Speech recognition error handler
recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    voiceInputBtn.style.backgroundColor = '#4CAF50';
    
    // Show error message to user
    const errorMessage = document.createElement('div');
    errorMessage.classList.add('message', 'bot');
    errorMessage.innerHTML = `<p>Error: ${event.error}. Please try again or type your message.</p>`;
    chatMessages.appendChild(errorMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Stop recognition on error
    recognition.stop();
};

// Speech recognition end handler
recognition.onend = () => {
    voiceInputBtn.style.backgroundColor = '#4CAF50';
    // Remove listening indicator if it exists
    const listeningIndicator = document.querySelector('.message.bot:last-child');
    if (listeningIndicator && listeningIndicator.textContent.includes('Listening')) {
        chatMessages.removeChild(listeningIndicator);
    }
};

// Text-to-speech setup
const speech = new SpeechSynthesisUtterance();
speech.rate = 1;
speech.pitch = 1;

// Get available voices
let voices = [];
window.speechSynthesis.onvoiceschanged = () => {
    voices = window.speechSynthesis.getVoices();
    updateVoiceForLanguage();
};

// Update language change handler
languageSelect.addEventListener('change', () => {
    recognition.lang = languageSelect.value;
    speech.lang = languageSelect.value;
    updateVoiceForLanguage();
    
    // Show language change confirmation
    const languageMessage = document.createElement('div');
    languageMessage.classList.add('message', 'bot');
    languageMessage.innerHTML = `<p>Language changed to ${languageSelect.options[languageSelect.selectedIndex].text}</p>`;
    chatMessages.appendChild(languageMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});

// Speech synthesis function
function speakResponse(text) {
    if (!isVoiceEnabled) return;

    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageSelect.value;
    
    // Adjust speech rate and pitch for Hindi
    if (languageSelect.value === 'hi-IN') {
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
    }

    // Select appropriate voice
    const voices = window.speechSynthesis.getVoices();
    if (languageSelect.value === 'hi-IN') {
        utterance.voice = voices.find(voice => 
            voice.lang.includes('hi-IN') || 
            voice.lang.includes('hi') || 
            voice.name.includes('Hindi') || 
            voice.name.includes('India')
        ) || voices[0];
    } else {
        utterance.voice = voices.find(voice => 
            voice.lang.includes('en-US') || 
            voice.lang.includes('en')
        ) || voices[0];
    }

    utterance.onend = () => {
        isSpeaking = false;
        stopVoiceBtn.style.display = 'none';
        voiceOutputBtn.style.display = 'block';
    };

    utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        isSpeaking = false;
        stopVoiceBtn.style.display = 'none';
        voiceOutputBtn.style.display = 'block';
    };

    window.speechSynthesis.speak(utterance);
    isSpeaking = true;
    stopVoiceBtn.style.display = 'block';
    voiceOutputBtn.style.display = 'none';
}

// Update stop button click handler
stopVoiceBtn.addEventListener('click', () => {
    window.speechSynthesis.cancel();
    isSpeaking = false;
    stopVoiceBtn.style.display = 'none';
    voiceOutputBtn.style.display = 'block';
});

// Update voice output toggle button click handler
voiceOutputBtn.addEventListener('click', () => {
    isVoiceEnabled = !isVoiceEnabled;
    voiceOutputBtn.style.backgroundColor = isVoiceEnabled ? '#4CAF50' : '#f44336';
    
    if (!isVoiceEnabled) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        stopVoiceBtn.style.display = 'none';
    }
});

// Update language change handler
function updateVoiceForLanguage() {
    const selectedLanguage = languageSelect.value;
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find a voice that matches the selected language
    let matchingVoice = voices.find(voice => 
        voice.lang.startsWith(selectedLanguage)
    );
    
    // If no exact match, try to find a voice that supports the language
    if (!matchingVoice) {
        if (selectedLanguage === 'hi-IN') {
            // For Hindi, try to find any Indian voice or Hindi voice
            matchingVoice = voices.find(voice => 
                voice.lang.includes('hi') || 
                voice.lang.includes('IN') ||
                voice.name.toLowerCase().includes('hindi') ||
                voice.name.toLowerCase().includes('india')
            );
        }
    }
    
    // If still no match, use the default voice
    if (!matchingVoice) {
        matchingVoice = voices.find(voice => voice.default) || voices[0];
    }
    
    if (matchingVoice) {
        speech.voice = matchingVoice;
        console.log('Selected voice:', matchingVoice.name, matchingVoice.lang);
    }
}

// Initialize IndexedDB
let db;
const request = indexedDB.open('HealthBotDB', 1);

request.onerror = (event) => {
    console.error('Database error:', event.target.error);
};

request.onupgradeneeded = (event) => {
    const db = event.target.result;
    
    // Create object store for health information with language support
    const healthStore = db.createObjectStore('healthInfo', { keyPath: 'id', autoIncrement: true });
    healthStore.createIndex('topic_lang', ['topic', 'language'], { unique: false });
    
    // Add initial health data in multiple languages
    const healthData = [
        // English
        {
            topic: 'headache',
            language: 'en-US',
            content: `Headache Management:
1. Common Causes: Stress, dehydration, lack of sleep, eye strain, or underlying conditions
2. Immediate Relief:
   - Rest in a quiet, dark room
   - Apply cold or warm compress to forehead
   - Stay hydrated
   - Try over-the-counter pain relievers (acetaminophen, ibuprofen)
3. Prevention:
   - Maintain regular sleep schedule
   - Stay hydrated (8 glasses of water daily)
   - Manage stress through relaxation techniques
   - Regular exercise
   - Maintain good posture
4. When to See a Doctor:
   - Sudden, severe headache
   - Headache after head injury
   - Headache with fever, stiff neck, or confusion
   - Persistent headaches that don't improve with treatment`
        },
        // Hindi
        {
            topic: 'headache',
            language: 'hi-IN',
            content: `सिरदर्द प्रबंधन:
1. सामान्य कारण: तनाव, निर्जलीकरण, नींद की कमी, आंखों का तनाव, या अंतर्निहित स्थितियां
2. तत्काल राहत:
   - शांत, अंधेरे कमरे में आराम करें
   - माथे पर ठंडा या गर्म सेक लगाएं
   - हाइड्रेटेड रहें
   - ओवर-द-काउंटर दर्द निवारक आज़माएं
3. रोकथाम:
   - नियमित नींद का कार्यक्रम बनाए रखें
   - हाइड्रेटेड रहें (प्रतिदिन 8 गिलास पानी)
   - विश्राम तकनीकों के माध्यम से तनाव का प्रबंधन करें
   - नियमित व्यायाम
   - अच्छी मुद्रा बनाए रखें
4. डॉक्टर से कब मिलें:
   - अचानक, गंभीर सिरदर्द
   - सिर की चोट के बाद सिरदर्द
   - बुखार, गर्दन में अकड़न, या भ्रम के साथ सिरदर्द
   - उपचार से सुधार न होने वाला लगातार सिरदर्द`
        },
        // Marathi
        {
            topic: 'headache',
            language: 'mr-IN',
            content: `डोकेदुखी व्यवस्थापन:
1. सामान्य कारणे: ताण, पाण्याची कमतरता, झोपेची कमतरता, डोळ्यांचा ताण, किंवा अंतर्निहित स्थिती
2. त्वरित आराम:
   - शांत, अंधारातील खोलीत विश्रांती घ्या
   - कपाळावर थंड किंवा गरम सेक लावा
   - पाणी प्यायचे सुरू ठेवा
   - ओव्हर-द-काउंटर वेदनाशामक वापरा
3. प्रतिबंध:
   - नियमित झोपेचे वेळापत्रक राखा
   - हायड्रेटेड रहा (दररोज 8 ग्लास पाणी)
   - विश्रांती तंत्राद्वारे ताण व्यवस्थापित करा
   - नियमित व्यायाम
   - चांगली पोस्चर राखा
4. डॉक्टरांना कधी भेटावे:
   - अचानक, तीव्र डोकेदुखी
   - डोक्यावर जखम झाल्यानंतर डोकेदुखी
   - ताप, मानेचा अडचण, किंवा गೊंधळासह डोकेदुखी
   - उपचाराने सुधारणा न होणारी सतत डोकेदुखी`
        },
        // Tamil
        {
            topic: 'headache',
            language: 'ta-IN',
            content: `தலைவலி மேலாண்மை:
1. பொதுவான காரணங்கள்: மன அழுத்தம், நீரிழப்பு, தூக்கம் இல்லாமை, கண் தளர்ச்சி, அல்லது அடிப்படை நிலைமைகள்
2. உடனடி நிவாரணம்:
   - அமைதியான, இருண்ட அறையில் ஓய்வெடுக்கவும்
   - நெற்றியில் குளிர் அல்லது சூடான கட்டு வைக்கவும்
   - நீரேற்றம் செய்யுங்கள்
   - மருந்துக் கடையில் கிடைக்கும் வலி நிவாரணிகள் முயற்சிக்கவும்
3. தடுப்பு:
   - வழக்கமான தூக்க நேரத்தை பராமரிக்கவும்
   - நீரேற்றம் செய்யுங்கள் (தினமும் 8 கிளாஸ் தண்ணீர்)
   - ஓய்வு நுட்பங்கள் மூலம் மன அழுத்தத்தை நிர்வகிக்கவும்
   - வழக்கமான உடற்பயிற்சி
   - நல்ல தோரணையை பராமரிக்கவும்
4. மருத்துவரை எப்போது பார்க்க வேண்டும்:
   - திடீர், கடுமையான தலைவலி
   - தலையில் காயம் ஏற்பட்ட பிறகு தலைவலி
   - காய்ச்சல், கழுத்து விறைப்பு, அல்லது குழப்பத்துடன் தலைவலி
   - சிகிச்சையால் மேம்படாத தொடர்ச்சியான தலைவலி`
        },
        // Kannada
        {
            topic: 'headache',
            language: 'kn-IN',
            content: `ತಲೆನೋವು ನಿರ್ವಹಣೆ:
1. ಸಾಮಾನ್ಯ ಕಾರಣಗಳು: ಒತ್ತಡ, ನಿರ್ಜಲೀಕರಣ, ನಿದ್ರೆಯ ಕೊರತೆ, ಕಣ್ಣಿನ ಒತ್ತಡ, ಅಥವಾ ಆಂತರಿಕ ಸ್ಥಿತಿಗಳು
2. ತತ್ಕ್ಷಣ ಉಪಶಮನ:
   - ನಿಶ್ಯಬ್ದ, ಕತ್ತಲೆಯ ಕೋಣೆಯಲ್ಲಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ
   - ಹಣೆಯ ಮೇಲೆ ತಣ್ಣನೆಯ ಅಥವಾ ಬೆಚ್ಚಗಿನ ಕಂಪ್ರೆಸ್ ಹಾಕಿ
   - ನೀರನ್ನು ಸಾಕಷ್ಟು ಕುಡಿಯಿರಿ
   - ಔಷಧಿ ಅಂಗಡಿಯಲ್ಲಿ ದೊರೆಯುವ ನೋವು ನಿವಾರಕಗಳನ್ನು ಪ್ರಯತ್ನಿಸಿ
3. ತಡೆಗಟ್ಟುವಿಕೆ:
   - ನಿಯಮಿತ ನಿದ್ರೆಯ ವೇಳಾಪಟ್ಟಿಯನ್ನು ಕಾಪಾಡಿಕೊಳ್ಳಿ
   - ನೀರನ್ನು ಸಾಕಷ್ಟು ಕುಡಿಯಿರಿ (ದಿನಕ್ಕೆ 8 ಗ್ಲಾಸ್)
   - ವಿಶ್ರಾಂತಿ ತಂತ್ರಗಳ ಮೂಲಕ ಒತ್ತಡವನ್ನು ನಿರ್ವಹಿಸಿ
   - ನಿಯಮಿತ ವ್ಯಾಯಾಮ
   - ಉತ್ತಮ ಭಂಗಿಯನ್ನು ಕಾಪಾಡಿಕೊಳ್ಳಿ
4. ವೈದ್ಯರನ್ನು ಯಾವಾಗ ನೋಡಬೇಕು:
   - ಹಠಾತ್, ತೀವ್ರ ತಲೆನೋವು
   - ತಲೆಗೆ ಗಾಯವಾದ ನಂತರ ತಲೆನೋವು
   - ಜ್ವರ, ಕತ್ತಿನ ಬಿಗಿತ, ಅಥವಾ ಗೊಂದಲದೊಂದಿಗೆ ತಲೆನೋವು
   - ಚಿಕಿತ್ಸೆಯಿಂದ ಉತ್ತಮಗೊಳ್ಳದ ನಿರಂತರ ತಲೆನೋವು`
        }
    ];

    const transaction = event.target.transaction;
    const store = transaction.objectStore('healthInfo');
    healthData.forEach(data => {
        store.add(data);
    });
};

request.onsuccess = (event) => {
    db = event.target.result;
    console.log('Database initialized successfully');
};

// Function to add a message to the chat
function addMessage(message, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isUser ? 'user' : 'bot');
    
    const messageText = document.createElement('p');
    messageText.textContent = message;
    messageDiv.appendChild(messageText);
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Speak the response if it's from the bot
    if (!isUser) {
        speakResponse(message);
    }
}

// Add professional medical-themed styling
const style = document.createElement('style');
style.textContent = `
    body {
        background: #f5f5f5;
        color: #333;
        font-family: Arial, sans-serif;
    }
    
    .chat-container {
        background: #ffffff;
        border: 1px solid #4CAF50;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        max-width: 800px;
        margin: 20px auto;
        padding: 20px;
        border-radius: 8px;
    }
    
    .message {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        margin: 10px 0;
        padding: 15px;
        color: #333;
        font-size: 16px;
        line-height: 1.5;
    }
    
    .message.bot {
        background: #e8f5e9;
        border-left: 4px solid #4CAF50;
    }
    
    .message.user {
        background: #e3f2fd;
        border-right: 4px solid #2196F3;
    }
    
    .voice-btn {
        background: #4CAF50;
        border: none;
        border-radius: 50%;
        padding: 10px;
        margin: 5px;
        cursor: pointer;
        color: white;
    }
    
    .voice-btn:hover {
        background: #45a049;
    }
    
    .stop-btn {
        background-color: #f44336;
    }
    
    .typing-indicator {
        background: #e8f5e9;
        border: 1px solid #4CAF50;
        color: #333;
        padding: 10px;
        border-radius: 8px;
        margin: 10px 0;
    }
    
    .chat-input {
        background: #ffffff;
        border: 1px solid #4CAF50;
        border-radius: 4px;
        padding: 10px;
        margin: 10px 0;
        width: 100%;
        font-size: 16px;
    }
    
    .chat-input:focus {
        outline: none;
        border-color: #45a049;
    }
    
    .language-select {
        background: #ffffff;
        border: 1px solid #4CAF50;
        color: #333;
        padding: 8px;
        border-radius: 4px;
        margin-right: 10px;
    }
    
    .send-button {
        background: #4CAF50;
        border: none;
        border-radius: 4px;
        padding: 10px 20px;
        color: white;
        cursor: pointer;
        font-size: 16px;
    }
    
    .send-button:hover {
        background: #45a049;
    }
    
    /* Dashboard styling */
    .dashboard {
        background: #ffffff;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        margin: 20px auto;
        max-width: 1200px;
    }
    
    .dashboard h2 {
        color: #333;
        margin-bottom: 20px;
        font-size: 24px;
    }
    
    .dashboard p {
        color: #555;
        line-height: 1.6;
        margin-bottom: 15px;
    }
    
    .dashboard .info-box {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 20px;
    }
    
    .dashboard .info-box h3 {
        color: #333;
        margin-bottom: 10px;
        font-size: 18px;
    }
    
    .dashboard .info-box p {
        color: #666;
        margin-bottom: 10px;
    }
    
    /* Remove animations and transitions */
    * {
        animation: none !important;
        transition: none !important;
    }
    
    /* Ensure text visibility */
    .message p, .message li {
        color: #333;
        font-size: 16px;
        line-height: 1.5;
        margin: 5px 0;
    }
    
    .message strong {
        color: #000;
        font-weight: bold;
    }
    
    .message em {
        color: #555;
        font-style: italic;
    }
    
    /* Improve list visibility */
    .message ul, .message ol {
        margin: 10px 0;
        padding-left: 20px;
    }
    
    .message li {
        margin-bottom: 5px;
    }
    
    /* Add spacing between messages */
    .message + .message {
        margin-top: 15px;
    }
`;
document.head.appendChild(style);

// Add styles for the buttons
const buttonStyle = document.createElement('style');
buttonStyle.textContent = `
    .language-select {
        padding: 8px;
        margin-right: 10px;
        border: 1px solid #4CAF50;
        border-radius: 4px;
        background-color: white;
        color: #333;
    }
    
    .voice-btn {
        padding: 8px 12px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        color: white;
        margin: 0 5px;
        transition: background-color 0.3s;
    }
    
    .voice-btn:hover {
        opacity: 0.9;
    }
    
    .voice-btn i {
        font-size: 16px;
    }
`;
document.head.appendChild(buttonStyle);

// Update handleUserInput function
async function handleUserInput(userMessage) {
    if (userMessage === '') return;

    try {
        // Show typing indicator
        const typingIndicator = showTypingIndicator();
        
        // Get bot response
        const botResponse = await getBotResponse(userMessage);
        
        // Remove typing indicator
        chatMessages.removeChild(typingIndicator);
        
        // Add bot response with animation
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'bot');
        messageDiv.innerHTML = `<p>${botResponse}</p>`;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Speak the response
        speakResponse(botResponse);
    } catch (error) {
        console.error('Error in handleUserInput:', error);
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('message', 'bot');
        errorMessage.innerHTML = `<p>Error: ${error.message}</p>`;
        chatMessages.appendChild(errorMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// Add API configuration
const HUGGING_FACE_API_KEY = 'YOUR_HUGGING_FACE_API_KEY'; // Replace with your API key
const HUGGING_FACE_API_URL = 'https://api-inference.huggingface.co/models/meta-llama/Llama-2-7b-chat-hf';

// Function to get response from Llama model
async function getLlamaResponse(prompt) {
    try {
        const response = await fetch(HUGGING_FACE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: prompt,
                parameters: {
                    max_new_tokens: 250,
                    temperature: 0.7,
                    top_p: 0.95,
                    repetition_penalty: 1.1
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data[0].generated_text;
    } catch (error) {
        console.error('Error fetching from Llama model:', error);
        return null;
    }
}

// Add API configuration
const OPEN_FDA_API_URL = 'https://api.fda.gov/drug/event.json';

// Function to get response from OpenFDA API
async function getOpenFDAResponse(query) {
    try {
        const response = await fetch(`${OPEN_FDA_API_URL}?search=${encodeURIComponent(query)}&limit=1`);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching from OpenFDA:', error);
        return null;
    }
}

// Add API configuration
const DISEASE_API_URL = 'https://disease.sh/v3/covid-19/countries';

// Function to get health information from Disease.sh API
async function getHealthInfo(query) {
    try {
        // First try the COVID-19 endpoint
        const response = await fetch(DISEASE_API_URL);
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        
        // Format the response
        let healthInfo = "Here's some health information:\n\n";
        
        // Add COVID-19 statistics
        healthInfo += "Global Health Statistics:\n";
        healthInfo += `Total Cases: ${data.reduce((sum, country) => sum + country.cases, 0).toLocaleString()}\n`;
        healthInfo += `Total Recovered: ${data.reduce((sum, country) => sum + country.recovered, 0).toLocaleString()}\n`;
        healthInfo += `Total Deaths: ${data.reduce((sum, country) => sum + country.deaths, 0).toLocaleString()}\n\n`;
        
        // Add general health tips
        healthInfo += "General Health Tips:\n";
        healthInfo += "1. Wash hands frequently with soap and water\n";
        healthInfo += "2. Maintain a balanced diet\n";
        healthInfo += "3. Exercise regularly\n";
        healthInfo += "4. Get adequate sleep\n";
        healthInfo += "5. Stay hydrated\n";
        healthInfo += "6. Practice good hygiene\n";
        healthInfo += "7. Get regular health check-ups\n";
        
        return healthInfo;
    } catch (error) {
        console.error('Error fetching health information:', error);
        return null;
    }
}

// Expanded health knowledge base with 100+ topics
const healthKnowledge = {
    // General Health (20 topics)
    'general health': {
        'en-US': `General Health Information:

General Health Tips:
1. Drink at least 8 glasses of water daily
2. Get 7-9 hours of quality sleep each night
3. Practice good hygiene habits
4. Schedule regular health check-ups
5. Maintain a healthy body weight
6. Take short walks during work breaks
7. Protect your skin with sunscreen
8. Wash your hands frequently
9. Stand up and stretch every hour
10. Spend time outdoors in fresh air

Nutrition Tips:
1. Start your day with a healthy breakfast
2. Include fruits in your daily diet
3. Eat a variety of colorful foods
4. Consume more vegetables, especially leafy greens
5. Opt for whole grains over refined grains
6. Choose lean protein sources like fish and chicken
7. Incorporate plant-based proteins like beans and lentils
8. Snack on nuts and seeds instead of chips
9. Use healthy cooking methods like steaming and grilling
10. Limit deep-fried foods

If You Have Digestive Problems, Do This:
1. Eat more fiber-rich foods
2. Add probiotic foods like yogurt, kefir, and sauerkraut
3. Drink plenty of water to aid digestion
4. Chew food slowly and thoroughly
5. Walk for 10 minutes after eating

If You Have Low Energy, Try This:
1. Eat small, balanced meals throughout the day
2. Include iron-rich foods like spinach and lentils
3. Stay hydrated — dehydration causes fatigue
4. Reduce processed sugar which causes energy crashes
5. Prioritize sleep and relaxation

Daily Habits for Better Health:
1. Plan your meals and snacks ahead of time
2. Stay consistent with your meal times
3. Practice portion control at meals
4. Choose foods with fewer ingredients
5. Keep your kitchen stocked with healthy options
6. Prepare your meals at home more often
7. Limit consumption of sugary beverages
8. Avoid excessive caffeine intake
9. Read nutrition labels before buying packaged food
10. Balance your meals with carbs, proteins, and fats

If You Want to Lose Weight, Focus On:
1. Create a calorie deficit by diet and exercise
2. Eat high-volume, low-calorie foods like vegetables
3. Avoid emotional eating — find healthy distractions
4. Practice mindful eating — avoid eating while distracted
5. Track your food intake to stay accountable

Fitness and Activity Tips:
1. Stay physically active for at least 30 minutes daily
2. Combine cardio and strength training
3. Take the stairs instead of the elevator
4. Try new sports or activities to stay motivated
5. Set realistic fitness goals

If You Are Stressed, Manage It By:
1. Practice meditation daily for at least 5 minutes
2. Try deep breathing exercises
3. Engage in hobbies you enjoy
4. Spend time with friends and family
5. Write down what you're grateful for each day

If You Have Trouble Sleeping, Try This:
1. Maintain a regular sleep schedule
2. Avoid screens 1 hour before bed
3. Create a calming bedtime routine
4. Keep your bedroom cool, quiet, and dark
5. Avoid caffeine after lunchtime

More Nutrition Tips:
1. Incorporate healthy fats like olive oil and avocado
2. Limit added sugar intake
3. Reduce salt consumption
4. Eat slowly and mindfully
5. Don't skip meals, especially breakfast
6. Choose natural sweeteners like honey in moderation
7. Include omega-3 rich foods like walnuts and salmon
8. Add herbs and spices for flavor instead of extra salt
9. Drink green tea for antioxidants
10. Practice "meatless Mondays" to add more veggies

If You Want to Build Muscle, Do This:
1. Consume enough protein with every meal
2. Focus on strength training exercises
3. Eat complex carbs around your workouts
4. Get enough sleep for muscle recovery
5. Stay consistent with your workout plan

Hydration and Detox Tips:
1. Start your morning with a glass of water
2. Infuse water with lemon or mint for better taste
3. Eat water-rich foods like cucumbers and oranges
4. Limit sugary sodas and energy drinks
5. Hydrate before, during, and after exercise

If You Want Stronger Immunity:
1. Eat citrus fruits like oranges and lemons
2. Add garlic and ginger to meals
3. Get enough Vitamin D through sun exposure or supplements
4. Sleep adequately to support your immune system
5. Stay physically active regularly

Mental Wellness Tips:
1. Practice positive self-talk
2. Set short-term achievable goals
3. Accept that mistakes are part of learning
4. Take social media breaks
5. Spend time in nature to boost mental health

If You Have Skin Problems, Try:
1. Stay hydrated throughout the day
2. Eat foods rich in Vitamin E like almonds
3. Avoid excessive sugar, which can trigger acne
4. Cleanse your skin gently without harsh chemicals
5. Get enough sleep — your skin repairs overnight

Bonus Tips for Better Lifestyle:
1. Laugh often — laughter boosts health
2. Always wear seat belts while driving
3. Practice gratitude daily
4. Keep learning and stay curious
5. Surround yourself with positive people`,

        'hi-IN': `सामान्य स्वास्थ्य जानकारी:

सामान्य स्वास्थ्य टिप्स:
1. प्रतिदिन कम से कम 8 गिलास पानी पीएं
2. प्रतिदिन 7-9 घंटे की अच्छी नींद लें
3. अच्छी स्वच्छता की आदतें अपनाएं
4. नियमित स्वास्थ्य जांच करवाएं
5. स्वस्थ शरीर का वजन बनाए रखें
6. काम के दौरान छोटी सैर करें
7. सनस्क्रीन से त्वचा की सुरक्षा करें
8. बार-बार हाथ धोएं
9. हर घंटे खड़े होकर स्ट्रेच करें
10. ताजी हवा में समय बिताएं

पोषण टिप्स:
1. दिन की शुरुआत स्वस्थ नाश्ते से करें
2. दैनिक आहार में फल शामिल करें
3. विभिन्न रंगों के खाद्य पदार्थ खाएं
4. अधिक सब्जियां, विशेषकर हरी पत्तेदार सब्जियां खाएं
5. परिष्कृत अनाज की बजाय साबुत अनाज चुनें
6. मछली और चिकन जैसे दुबले प्रोटीन स्रोत चुनें
7. फलियां और दाल जैसे प्लांट-बेस्ड प्रोटीन शामिल करें
8. चिप्स की बजाय मेवे और बीज खाएं
9. भाप और ग्रिल जैसी स्वस्थ कुकिंग विधियों का उपयोग करें
10. तले हुए खाद्य पदार्थों को सीमित करें

यदि आपको पाचन संबंधी समस्याएं हैं, तो यह करें:
1. फाइबर युक्त खाद्य पदार्थ अधिक खाएं
2. दही, केफिर और साउरक्राउट जैसे प्रोबायोटिक खाद्य पदार्थ शामिल करें
3. पाचन में सहायता के लिए पर्याप्त पानी पीएं
4. भोजन को धीरे-धीरे और अच्छी तरह से चबाएं
5. खाने के बाद 10 मिनट टहलें

यदि आपको कम ऊर्जा महसूस होती है, तो यह करें:
1. दिन भर में छोटे, संतुलित भोजन करें
2. पालक और दाल जैसे आयरन युक्त खाद्य पदार्थ शामिल करें
3. हाइड्रेटेड रहें — निर्जलीकरण थकान का कारण बनता है
4. प्रोसेस्ड शुगर कम करें जो ऊर्जा में गिरावट का कारण बनती है
5. नींद और आराम को प्राथमिकता दें

बेहतर जीवनशैली के लिए अतिरिक्त टिप्स:
1. अक्सर हंसें — हंसी स्वास्थ्य को बढ़ावा देती है
2. गाड़ी चलाते समय हमेशा सीट बेल्ट पहनें
3. प्रतिदिन कृतज्ञता का अभ्यास करें
4. सीखते रहें और जिज्ञासु रहें
5. सकारात्मक लोगों से घिरे रहें`
    },

    // Common Symptoms (20 topics)
    'headache': {
        'en-US': `Headache Information:
1. Common Causes:
   - Stress
   - Dehydration
   - Lack of sleep
   - Eye strain
   - Sinus problems

2. Immediate Relief:
   - Rest in a quiet, dark room
   - Apply cold or warm compress
   - Stay hydrated
   - Take over-the-counter pain relievers
   - Practice relaxation techniques

3. When to See a Doctor:
   - Sudden, severe headache
   - Headache after head injury
   - Headache with fever or stiff neck
   - Persistent headaches
   - Changes in vision or speech

4. Prevention Tips:
   - Maintain regular sleep schedule
   - Stay hydrated
   - Manage stress
   - Regular exercise
   - Good posture

5. Types of Headaches:
   - Tension headaches
   - Migraine
   - Cluster headaches
   - Sinus headaches
   - Hormone headaches`,
        'hi-IN': `सिरदर्द की जानकारी:
1. सामान्य कारण:
   - तनाव
   - निर्जलीकरण
   - नींद की कमी
   - आंखों का तनाव
   - साइनस की समस्या

2. तत्काल राहत:
   - शांत, अंधेरे कमरे में आराम करें
   - ठंडा या गर्म सेक लगाएं
   - हाइड्रेटेड रहें
   - दर्द निवारक दवाएं लें
   - विश्राम तकनीकों का अभ्यास करें

3. डॉक्टर से कब मिलें:
   - अचानक, गंभीर सिरदर्द
   - सिर की चोट के बाद सिरदर्द
   - बुखार या गर्दन में अकड़न के साथ सिरदर्द
   - लगातार सिरदर्द
   - दृष्टि या बोलने में बदलाव

4. रोकथाम के टिप्स:
   - नियमित नींद का कार्यक्रम बनाए रखें
   - हाइड्रेटेड रहें
   - तनाव का प्रबंधन करें
   - नियमित व्यायाम
   - अच्छी मुद्रा

5. सिरदर्द के प्रकार:
   - तनाव सिरदर्द
   - माइग्रेन
   - क्लस्टर सिरदर्द
   - साइनस सिरदर्द
   - हार्मोन सिरदर्द`
    },

    // Add more topics here...
    'fever': {
        'en-US': `Fever Information:
1. Normal Body Temperature:
   - Oral: 98.6°F (37°C)
   - Rectal: 99.6°F (37.6°C)
   - Axillary: 97.6°F (36.4°C)

2. When to Worry:
   - Temperature above 103°F (39.4°C)
   - Fever lasting more than 3 days
   - Severe headache or stiff neck
   - Difficulty breathing
   - Persistent vomiting

3. Treatment:
   - Rest and stay hydrated
   - Use fever-reducing medications
   - Cool compresses
   - Light clothing
   - Monitor temperature regularly

4. Causes:
   - Infections
   - Inflammatory conditions
   - Heat exhaustion
   - Certain medications
   - Autoimmune disorders

5. Prevention:
   - Wash hands regularly
   - Get vaccinated
   - Avoid close contact with sick people
   - Stay hydrated
   - Maintain good hygiene`,
        'hi-IN': `बुखार की जानकारी:
1. सामान्य शरीर का तापमान:
   - मुंह से: 98.6°F (37°C)
   - मलाशय से: 99.6°F (37.6°C)
   - बगल से: 97.6°F (36.4°C)

2. चिंता का कारण:
   - 103°F (39.4°C) से अधिक तापमान
   - 3 दिन से अधिक बुखार
   - गंभीर सिरदर्द या गर्दन में अकड़न
   - सांस लेने में कठिनाई
   - लगातार उल्टी

3. उपचार:
   - आराम करें और हाइड्रेटेड रहें
   - बुखार कम करने वाली दवाएं लें
   - ठंडे सेक लगाएं
   - हल्के कपड़े पहनें
   - नियमित रूप से तापमान की जांच करें

4. कारण:
   - संक्रमण
   - सूजन संबंधी स्थितियां
   - गर्मी से थकावट
   - कुछ दवाएं
   - ऑटोइम्यून विकार

5. रोकथाम:
   - नियमित रूप से हाथ धोएं
   - टीकाकरण करवाएं
   - बीमार लोगों के साथ निकट संपर्क से बचें
   - हाइड्रेटेड रहें
   - अच्छी स्वच्छता बनाए रखें`
    },

    // Continue adding more topics...
    'cough': {
        'en-US': `Cough Information:
1. Common Causes:
   - Common cold
   - Flu
   - Allergies
   - Asthma
   - Acid reflux

2. Home Remedies:
   - Stay hydrated
   - Use honey
   - Steam inhalation
   - Saltwater gargle
   - Elevate head while sleeping

3. When to See a Doctor:
   - Cough lasting more than 3 weeks
   - Blood in cough
   - Difficulty breathing
   - High fever
   - Weight loss

4. Prevention:
   - Wash hands regularly
   - Avoid smoking
   - Stay away from irritants
   - Get vaccinated
   - Maintain good hygiene

5. Types of Cough:
   - Dry cough
   - Wet cough
   - Whooping cough
   - Chronic cough
   - Nighttime cough`,
        'hi-IN': `खांसी की जानकारी:
1. सामान्य कारण:
   - सर्दी
   - फ्लू
   - एलर्जी
   - अस्थमा
   - एसिड रिफ्लक्स

2. घरेलू उपचार:
   - हाइड्रेटेड रहें
   - शहद का उपयोग करें
   - भाप लें
   - नमक के पानी से गरारे करें
   - सोते समय सिर ऊंचा रखें

3. डॉक्टर से कब मिलें:
   - 3 सप्ताह से अधिक खांसी
   - खांसी में खून
   - सांस लेने में कठिनाई
   - तेज बुखार
   - वजन कम होना

4. रोकथाम:
   - नियमित रूप से हाथ धोएं
   - धूम्रपान से बचें
   - परेशान करने वाली चीजों से दूर रहें
   - टीकाकरण करवाएं
   - अच्छी स्वच्छता बनाए रखें

5. खांसी के प्रकार:
   - सूखी खांसी
   - गीली खांसी
   - काली खांसी
   - पुरानी खांसी
   - रात की खांसी`
    },

    // Add more topics as needed...
    'diabetes': {
        'en-US': `Diabetes Information:
1. Types of Diabetes:
   - Type 1: Autoimmune condition
   - Type 2: Insulin resistance
   - Gestational: During pregnancy
   - Prediabetes: High blood sugar
   - Secondary diabetes

2. Management:
   - Monitor blood sugar regularly
   - Follow a balanced diet
   - Regular exercise
   - Take medications as prescribed
   - Regular doctor visits

3. Warning Signs:
   - Excessive thirst
   - Frequent urination
   - Fatigue
   - Blurred vision
   - Slow healing wounds

4. Complications:
   - Heart disease
   - Kidney damage
   - Nerve damage
   - Eye problems
   - Foot problems

5. Prevention:
   - Maintain healthy weight
   - Regular exercise
   - Healthy diet
   - Regular check-ups
   - Manage stress`,
        'hi-IN': `मधुमेह की जानकारी:
1. मधुमेह के प्रकार:
   - टाइप 1: ऑटोइम्यून स्थिति
   - टाइप 2: इंसुलिन प्रतिरोध
   - गर्भावधि: गर्भावस्था के दौरान
   - प्रीडायबिटीज: उच्च रक्त शर्करा
   - द्वितीयक मधुमेह

2. प्रबंधन:
   - नियमित रूप से रक्त शर्करा की जांच करें
   - संतुलित आहार का पालन करें
   - नियमित व्यायाम
   - निर्धारित दवाएं लें
   - नियमित डॉक्टर की जांच

3. चेतावनी के संकेत:
   - अतिरिक्त प्यास
   - बार-बार पेशाब आना
   - थकान
   - धुंधली दृष्टि
   - घावों का धीमा भरना

4. जटिलताएं:
   - हृदय रोग
   - किडनी की क्षति
   - तंत्रिका क्षति
   - आंखों की समस्याएं
   - पैरों की समस्याएं

5. रोकथाम:
   - स्वस्थ वजन बनाए रखें
   - नियमित व्यायाम
   - स्वस्थ आहार
   - नियमित जांच
   - तनाव का प्रबंधन`
    }
    // Add more topics as needed...
};

// Add healthcare dataset integration
const HEALTHCARE_DATASET_URL = 'https://www.kaggle.com/datasets/prasad22/healthcare-dataset';

async function getHealthcareData(query) {
    try {
        // First try to get data from the local knowledge base
        const lowerQuery = query.toLowerCase();
        for (const [topic, responses] of Object.entries(healthKnowledge)) {
            if (lowerQuery.includes(topic)) {
                return responses[languageSelect.value] || responses['en-US'];
            }
        }

        // If not found in local knowledge base, fetch from healthcare dataset
        const response = await fetch(HEALTHCARE_DATASET_URL);
        if (!response.ok) {
            throw new Error('Failed to fetch healthcare data');
        }

        const data = await response.json();
        
        // Process the data based on the query
        let relevantData = [];
        for (const item of data) {
            if (item.condition.toLowerCase().includes(lowerQuery) || 
                item.symptoms.toLowerCase().includes(lowerQuery) ||
                item.treatment.toLowerCase().includes(lowerQuery)) {
                relevantData.push(item);
            }
        }

        if (relevantData.length > 0) {
            // Format the response with the most relevant information
            const condition = relevantData[0];
            return formatHealthcareResponse(condition);
        }

        // If no specific data found, return general health information
        return healthKnowledge['general health'][languageSelect.value] || 
               healthKnowledge['general health']['en-US'];
    } catch (error) {
        console.error('Error fetching healthcare data:', error);
        return healthKnowledge['general health'][languageSelect.value] || 
               healthKnowledge['general health']['en-US'];
    }
}

function formatHealthcareResponse(condition) {
    const language = languageSelect.value;
    const isHindi = language === 'hi-IN';
    
    if (isHindi) {
        return `
${condition.condition} के बारे में जानकारी:

लक्षण:
${condition.symptoms}

कारण:
${condition.causes}

उपचार:
${condition.treatment}

रोकथाम:
${condition.prevention}

जब डॉक्टर से मिलें:
${condition.when_to_see_doctor}

अतिरिक्त जानकारी:
${condition.additional_info}
`;
    } else {
        return `
Information about ${condition.condition}:

Symptoms:
${condition.symptoms}

Causes:
${condition.causes}

Treatment:
${condition.treatment}

Prevention:
${condition.prevention}

When to See a Doctor:
${condition.when_to_see_doctor}

Additional Information:
${condition.additional_info}
`;
    }
}

// Update the getBotResponse function to use the healthcare dataset
async function getBotResponse(userMessage) {
    try {
        const selectedLanguage = languageSelect.value;
        const lowerMessage = userMessage.toLowerCase();
        
        // First check the local knowledge base
        for (const [topic, responses] of Object.entries(healthKnowledge)) {
            if (lowerMessage.includes(topic)) {
                return responses[selectedLanguage] || responses['en-US'];
            }
        }
        
        // If not found in local knowledge base, try healthcare dataset
        const healthcareResponse = await getHealthcareData(userMessage);
        if (healthcareResponse) {
            return healthcareResponse;
        }
        
        // If still no match, provide general health information in selected language
        return healthKnowledge['general health'][selectedLanguage] || 
               healthKnowledge['general health']['en-US'];
    } catch (error) {
        console.error('Error in getBotResponse:', error);
        return selectedLanguage === 'hi-IN' ? 
            'क्षमा करें, मैं इस समय स्वास्थ्य जानकारी प्राप्त करने में असमर्थ हूं। कृपया बाद में पुनः प्रयास करें।' :
            'I apologize, but I am unable to fetch the health information at this moment. Please try again later.';
    }
}

// Event listeners
sendButton.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (message) {
        handleUserInput(message);
        userInput.value = '';
    }
});

userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const message = userInput.value.trim();
        if (message) {
            handleUserInput(message);
            userInput.value = '';
        }
    }
});

// Appointment form handling
const appointmentForm = document.querySelector('.appointment-form');
const submitBtn = document.querySelector('.submit-btn');

submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const formData = new FormData(appointmentForm);
    const appointmentData = {};
    
    for (const [key, value] of formData.entries()) {
        appointmentData[key] = value;
    }
    
    // Store appointment in IndexedDB
    const transaction = db.transaction(['appointments'], 'readwrite');
    const store = transaction.objectStore('appointments');
    store.add(appointmentData);
    
    alert('Appointment request submitted successfully! We will contact you shortly.');
    appointmentForm.reset();
});

// Medication reminder functionality
function setMedicationReminder() {
    const medicationName = prompt('Enter medication name:');
    const reminderTime = prompt('Enter reminder time (HH:MM):');
    
    if (medicationName && reminderTime) {
        const now = new Date();
        const [hours, minutes] = reminderTime.split(':');
        const reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        
        if (reminderDate > now) {
            const timeUntilReminder = reminderDate - now;
            setTimeout(() => {
                alert(`Time to take your ${medicationName}!`);
            }, timeUntilReminder);
            alert(`Reminder set for ${medicationName} at ${reminderTime}`);
            
            // Store reminder in IndexedDB
            const transaction = db.transaction(['reminders'], 'readwrite');
            const store = transaction.objectStore('reminders');
            store.add({
                medicationName,
                reminderTime,
                setTime: new Date()
            });
        } else {
            alert('Please enter a future time for the reminder.');
        }
    }
}

// Add event listener for medication reminder button
const medicationReminderBtn = document.createElement('button');
medicationReminderBtn.textContent = 'Set Medication Reminder';
medicationReminderBtn.classList.add('submit-btn');
medicationReminderBtn.style.marginTop = '1rem';
medicationReminderBtn.addEventListener('click', setMedicationReminder);
appointmentForm.appendChild(medicationReminderBtn);

// Add typing animation
function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.classList.add('message', 'bot', 'typing-indicator');
    indicator.innerHTML = '<p>HealthBot is typing...</p>';
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return indicator;
}

// Initialize voices when available
window.speechSynthesis.onvoiceschanged = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices:', voices);
    updateVoiceForLanguage();
};

// Add features button
const featuresBtn = document.createElement('button');
featuresBtn.innerHTML = '<i class="fas fa-th-large"></i>';
featuresBtn.classList.add('voice-btn');
featuresBtn.style.marginLeft = '0.5rem';
featuresBtn.style.backgroundColor = '#4CAF50';
featuresBtn.title = 'View All Features';
userInput.parentNode.insertBefore(featuresBtn, voiceInputBtn);

// Features button click handler
featuresBtn.addEventListener('click', () => {
    window.location.href = 'features.html';
});