// CityPulse Citizen Reporting, Voice Note & Crowdsourced Intelligence
let isRecordingVoice = false;
let speechRecognizer = null;

function initReportingModule() {
  setupSpeechRecognition();
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    speechRecognizer = new SpeechRecognition();
    speechRecognizer.continuous = false;
    speechRecognizer.interimResults = true;
    speechRecognizer.lang = 'en-US';

    speechRecognizer.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
      }
      const voiceInput = document.getElementById('report-voice-transcript');
      if (voiceInput) voiceInput.value = transcript;
    };

    speechRecognizer.onend = () => {
      setRecordingState(false);
    };

    speechRecognizer.onerror = (e) => {
      console.warn("Speech recognition error:", e);
      setRecordingState(false);
    };
  }
}

function toggleVoiceRecording() {
  const btn = document.getElementById('btn-voice-record');
  const indicator = document.getElementById('recording-indicator');
  const transcriptField = document.getElementById('report-voice-transcript');

  if (!isRecordingVoice) {
    // Start Recording
    isRecordingVoice = true;
    setRecordingState(true);

    if (speechRecognizer) {
      try {
        speechRecognizer.start();
      } catch (e) {
        fallbackVoiceSimulation();
      }
    } else {
      fallbackVoiceSimulation();
    }
  } else {
    // Stop Recording
    isRecordingVoice = false;
    setRecordingState(false);
    if (speechRecognizer) {
      try { speechRecognizer.stop(); } catch(e){}
    }
  }
}

function setRecordingState(active) {
  isRecordingVoice = active;
  const btn = document.getElementById('btn-voice-record');
  const indicator = document.getElementById('recording-indicator');

  if (active) {
    if (btn) btn.classList.add('bg-red-600', 'text-white', 'animate-pulse');
    if (indicator) indicator.classList.remove('hidden');
  } else {
    if (btn) btn.classList.remove('bg-red-600', 'text-white', 'animate-pulse');
    if (indicator) indicator.classList.add('hidden');
  }
}

function fallbackVoiceSimulation() {
  // Graceful simulation when microphone permissions are denied or unsupported
  const transcriptField = document.getElementById('report-voice-transcript');
  if (!transcriptField) return;

  const sampleTranscripts = [
    "Reporting live from the south corner. Two major streetlights are completely out and female commuters feel unsafe.",
    "Major waterlogging at the low-lying subway entrance. Water is around knee level, avoid two-wheelers.",
    "Found an incredible 60-year-old Irani tea stall hidden inside the lane, amazing maska pav for twenty rupees!"
  ];
  
  let i = 0;
  transcriptField.value = "Listening to audio input...";
  setTimeout(() => {
    transcriptField.value = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
    setRecordingState(false);
  }, 2200);
}

function handlePhotoSelect(event) {
  const file = event.target.files[0];
  const preview = document.getElementById('report-photo-preview');
  if (file && preview) {
    const reader = new FileReader();
    reader.onload = function(e) {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  }
}

async function submitCitizenReport(event) {
  event.preventDefault();
  const form = document.getElementById('citizen-report-form');
  const city = window.currentCity || "Mumbai";

  const title = document.getElementById('report-title').value;
  const category = document.getElementById('report-category').value;
  const locationName = document.getElementById('report-location').value;
  const description = document.getElementById('report-desc').value;
  const voiceTranscript = document.getElementById('report-voice-transcript').value;
  const previewImg = document.getElementById('report-photo-preview');

  // Center coordinate default
  const lat = 18.9400 + (Math.random() - 0.5) * 0.05;
  const lng = 72.8350 + (Math.random() - 0.5) * 0.05;

  const payload = {
    city: city,
    category: category,
    title: title,
    description: description,
    lat: lat,
    lng: lng,
    location_name: locationName,
    image_url: previewImg && !previewImg.classList.contains('hidden') ? previewImg.src : null,
    voice_note_transcript: voiceTranscript || null,
    user_name: "Active Citizen"
  };

  const submitBtn = document.getElementById('btn-submit-report');
  submitBtn.disabled = true;
  submitBtn.innerText = "Submitting to AI Classifier...";

  try {
    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const savedReport = await res.json();
      showNotification(`Report #${savedReport.id} verified and categorized as [${savedReport.ai_urgency}].`, 'success');
      form.reset();
      if (previewImg) previewImg.classList.add('hidden');
      closeModal('modal-report');
      // Reload reports
      window.loadCitizenReports();
    } else {
      showNotification('Failed to submit report. Please try again.', 'error');
    }
  } catch (err) {
    console.error(err);
    showNotification('Network error while submitting report.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = "Submit Citizen Report";
  }
}

async function upvoteReport(reportId) {
  try {
    const res = await fetch(`/api/reports/${reportId}/upvote`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      const countEl = document.getElementById(`upvote-count-${reportId}`);
      if (countEl) countEl.innerText = data.upvotes;
      showNotification(`Report confirmed! Total verifications: ${data.upvotes}`, 'info');
    }
  } catch (e) {
    console.error(e);
  }
}
