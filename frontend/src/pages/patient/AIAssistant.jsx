import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../utils/config';

const QUICK_PROMPTS = [
    'I have common cold symptoms',
    'Explain my report in simple words',
    'Safe home care for acidity',
    'I feel anxious and stressed',
    'Sleep routine guidance',
];

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const INITIAL_MESSAGES = [
    {
        id: 1,
        from: 'ai',
        text: "Hello! I'm your **VaidyaMedX AI Doctor**. You can chat, start an AI video consult, or upload a report/scan for OCR analysis and safe remedy guidance.",
        time: nowTime(),
    },
];

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatText(text) {
    return escapeHtml(text)
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
}

function pickPayload(json) {
    return json?.data || json || {};
}

function asList(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function buildReportReply(payload, fileName) {
    const report = payload.report || {};
    const analysis = payload.analysis || {};
    const abnormal = payload.abnormalValues || asList(report.abnormalValues);
    const suggestions = analysis.suggestions || [];
    const diet = analysis.dietRecommendations || [];
    const lifestyle = analysis.lifestyleGuidance || [];
    const extractedText = report.extractedText || payload.extractedText || '';

    const sections = [
        `**OCR report scan complete: ${report.name || fileName}**`,
        extractedText
            ? `I extracted readable medical text from the file and found risk level: **${report.riskLevel || 'unknown'}**.`
            : 'The file was uploaded and checked, but the OCR text was limited. Please keep the original report ready for a clinician.',
    ];

    if (abnormal.length) {
        sections.push(
            `**Values to review**\n${abnormal.slice(0, 5).map(item => {
                const name = item.name || 'Finding';
                const value = item.value ? `: ${item.value}${item.unit ? ` ${item.unit}` : ''}` : '';
                const status = item.status ? ` (${item.status})` : '';
                return `- ${name}${value}${status}`;
            }).join('\n')}`
        );
    }

    if (payload.summary || report.summary) {
        sections.push(`**Doctor-style summary**\n${payload.summary || report.summary}`);
    }

    const remedies = [...suggestions, ...diet, analysis.hydrationAdvice, ...lifestyle]
        .filter(Boolean)
        .slice(0, 8);

    if (remedies.length) {
        sections.push(`**Safe remedies and care plan**\n${remedies.map(item => `- ${item}`).join('\n')}`);
    } else if (payload.ayurvedic || report.ayurvedic) {
        sections.push(`**Safe remedies and care plan**\n${payload.ayurvedic || report.ayurvedic}`);
    }

    sections.push('**Safety note:** This is AI guidance, not a diagnosis. Please consult a licensed doctor urgently for severe symptoms, abnormal critical values, chest pain, breathing trouble, fainting, heavy bleeding, or sudden weakness.');
    return sections.join('\n\n');
}

export default function AIAssistant() {
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [reportBusy, setReportBusy] = useState(false);
    const [callActive, setCallActive] = useState(false);
    const [callStatus, setCallStatus] = useState('Ready for AI video consult');
    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [callSeconds, setCallSeconds] = useState(0);
    const [scanCameraOpen, setScanCameraOpen] = useState(false);
    const [scanCameraError, setScanCameraError] = useState('');

    const recognition = useRef(null);
    const endRef = useRef(null);
    const fileRef = useRef(null);
    const localVideoRef = useRef(null);
    const scanVideoRef = useRef(null);
    const streamRef = useRef(null);
    const scanStreamRef = useRef(null);

    const token = () => localStorage.getItem('token') || sessionStorage.getItem('token');

    const addMessage = (from, text, extra = {}) => {
        const msg = {
            id: Date.now() + Math.random(),
            from,
            text,
            time: nowTime(),
            ...extra,
        };
        setMessages(prev => [...prev, msg]);
        return msg;
    };

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        recognition.current = new SpeechRecognition();
        recognition.current.continuous = false;
        recognition.current.interimResults = true;
        recognition.current.lang = 'en-IN';

        recognition.current.onstart = () => setIsRecording(true);
        recognition.current.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    setInterimTranscript('');
                    sendMessage(transcript);
                    recognition.current.stop();
                } else {
                    interim += transcript;
                    setInterimTranscript(interim);
                }
            }
        };
        recognition.current.onend = () => setIsRecording(false);
        recognition.current.onerror = () => setIsRecording(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing, interimTranscript, callActive]);

    useEffect(() => {
        if (!callActive) {
            setCallSeconds(0);
            return undefined;
        }
        const id = setInterval(() => setCallSeconds(value => value + 1), 1000);
        return () => clearInterval(id);
    }, [callActive]);

    useEffect(() => {
        if (!streamRef.current) return;
        streamRef.current.getVideoTracks().forEach(track => { track.enabled = cameraOn; });
        streamRef.current.getAudioTracks().forEach(track => { track.enabled = micOn; });
    }, [cameraOn, micOn]);

    useEffect(() => () => {
        stopVideoConsult();
        stopScanCamera();
    }, []);

    const playLocalTTS = (text) => {
        if (!window.speechSynthesis || !text) return;

        const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/[#*`_]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-IN';
        utterance.rate = 0.95;

        const voices = window.speechSynthesis.getVoices();
        const preferred =
            voices.find(v => v.lang.includes('IN') && /Google|Premium/i.test(v.name)) ||
            voices.find(v => v.lang.includes('IN')) ||
            voices.find(v => v.lang.includes('US'));

        if (preferred) utterance.voice = preferred;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    };

    const sendMessage = async (text) => {
        const msg = (text || input || interimTranscript).trim();
        if (!msg) return;

        setInput('');
        addMessage('user', msg);
        setTyping(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/wellness/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token()}`,
                },
                body: JSON.stringify({ message: msg }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }

            const aiMsgId = Date.now() + 1;
            setMessages(prev => [...prev, { id: aiMsgId, from: 'ai', text: '', time: nowTime() }]);

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                let shouldUpdateMessage = false;
                let shouldSpeak = false;
                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.chunk) {
                            fullText += data.chunk;
                            shouldUpdateMessage = true;
                        }
                        if (data.done && fullText) shouldSpeak = true;
                    } catch (err) {
                        console.warn('SSE parse error', err);
                    }
                }
                if (shouldUpdateMessage) {
                    const nextText = fullText;
                    setMessages(prev => prev.map(m => (
                        m.id === aiMsgId ? { ...m, text: nextText } : m
                    )));
                }
                if (shouldSpeak) playLocalTTS(fullText);
            }
        } catch (err) {
            console.error('AI Error:', err);
            addMessage('ai', 'The secure AI doctor service is busy right now. Please try again shortly.');
        } finally {
            setTyping(false);
            setInterimTranscript('');
        }
    };

    const handleVoiceToggle = () => {
        if (!recognition.current) {
            alert('Speech recognition is not supported in this browser.');
            return;
        }

        if (isRecording) {
            recognition.current.stop();
            setIsRecording(false);
            return;
        }

        try {
            recognition.current.start();
        } catch (err) {
            console.error('Speech recognition start error:', err);
        }
    };

    const startVideoConsult = async () => {
        if (callActive) return;

        setCallActive(true);
        setCallStatus('Connecting to AI doctor...');
        addMessage('ai', '**AI video consult started.** I can listen to your symptoms here in chat while you keep your camera open.');

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: 'user' },
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
            });
            streamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;
            setCameraOn(true);
            setMicOn(true);
            setCallStatus('AI doctor online');
            playLocalTTS('AI doctor video consultation started. Tell me your symptoms or upload a report scan.');
        } catch (err) {
            console.error('Camera error:', err);
            setCallStatus('Camera unavailable. Chat consult is still active.');
            addMessage('ai', 'Camera or microphone permission was not available. You can continue the AI doctor consultation by chat and report upload.');
        }
    };

    const stopVideoConsult = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        setCallActive(false);
        setCallStatus('Ready for AI video consult');
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
    };

    const processReportFile = async (file) => {
        const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
        if (!allowed.includes(file.type)) {
            alert('Only PDF, JPG, JPEG, and PNG reports are supported.');
            return false;
        }
        if (file.size > 20 * 1024 * 1024) {
            alert('Report must be under 20 MB.');
            return false;
        }

        setReportBusy(true);
        addMessage('user', `Uploaded report scan: ${file.name}`);
        const progressMsg = addMessage('ai', 'Uploading your report securely, then running OCR and AI doctor analysis...');

        try {
            const formData = new FormData();
            formData.append('files', file);
            formData.append('displayName', file.name.replace(/\.[^.]+$/, ''));

            const uploadRes = await fetch(`${API_BASE_URL}/api/reports`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}` },
                body: formData,
            });
            const uploadJson = await uploadRes.json();
            if (!uploadRes.ok) {
                throw new Error(uploadJson?.message || uploadJson?.error || 'Upload failed');
            }

            const uploadPayload = pickPayload(uploadJson);
            const report = uploadPayload.report || uploadPayload.reports?.[0];
            if (!report?.id) throw new Error('Report upload did not return a report id');

            setMessages(prev => prev.map(m => (
                m.id === progressMsg.id
                    ? { ...m, text: 'Report uploaded. OCR is reading the scan and AI doctor is preparing remedies...' }
                    : m
            )));

            const analyzeRes = await fetch(`${API_BASE_URL}/api/reports/${report.id}/analyze`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token()}` },
            });
            const analyzeJson = await analyzeRes.json();
            if (!analyzeRes.ok) {
                throw new Error(analyzeJson?.message || analyzeJson?.error || 'Analysis failed');
            }

            const analyzePayload = pickPayload(analyzeJson);
            const reply = buildReportReply(analyzePayload, file.name);

            setMessages(prev => prev.map(m => (
                m.id === progressMsg.id ? { ...m, text: reply } : m
            )));
            playLocalTTS(reply);
        } catch (err) {
            console.error('Report analysis error:', err);
            setMessages(prev => prev.map(m => (
                m.id === progressMsg.id
                    ? { ...m, text: `I could not complete the report OCR analysis: ${err.message || 'Please try again.'}` }
                    : m
            )));
        } finally {
            setReportBusy(false);
        }
        return true;
    };

    const handleReportFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        event.target.value = '';
        await processReportFile(file);
    };

    const startScanCamera = async () => {
        setScanCameraError('');
        setScanCameraOpen(true);
        try {
            const scanStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            });
            scanStreamRef.current = scanStream;
            if (scanVideoRef.current) scanVideoRef.current.srcObject = scanStream;
        } catch (err) {
            console.error('Scan camera error:', err);
            setScanCameraError('Camera access was not available. Please allow camera permission or upload a file instead.');
        }
    };

    const stopScanCamera = () => {
        if (scanStreamRef.current) {
            scanStreamRef.current.getTracks().forEach(track => track.stop());
            scanStreamRef.current = null;
        }
        if (scanVideoRef.current) scanVideoRef.current.srcObject = null;
        setScanCameraOpen(false);
    };

    const captureReportScan = () => {
        const video = scanVideoRef.current;
        if (!video || !video.videoWidth) {
            setScanCameraError('Camera is still starting. Please try again in a moment.');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (!blob) {
                setScanCameraError('Could not capture the report image. Please try again.');
                return;
            }
            const file = new File([blob], `report-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
            stopScanCamera();
            await processReportFile(file);
        }, 'image/jpeg', 0.92);
    };

    const callTime = `${String(Math.floor(callSeconds / 60)).padStart(2, '0')}:${String(callSeconds % 60).padStart(2, '0')}`;

    return (
        <div className="ai-doctor-shell">
            <div className="pd-page-header ai-doctor-header">
                <div className="ai-doctor-title">
                    <div className={`ai-doctor-avatar ${isSpeaking ? 'speaking' : ''}`}>
                        <span className="ai-doctor-cross">+</span>
                    </div>
                    <div>
                        <h1>VaidyaMedX AI Doctor</h1>
                        <p>Chat, AI video consult, OCR report scan, and safe remedy guidance.</p>
                    </div>
                </div>
                <button
                    type="button"
                    className={`pd-btn ${callActive ? 'pd-btn-danger' : 'pd-btn-primary'}`}
                    onClick={callActive ? stopVideoConsult : startVideoConsult}
                >
                    <span className="icon-video" aria-hidden="true"></span>
                    {callActive ? 'End AI Call' : 'Start AI Call'}
                </button>
            </div>

            {callActive && (
                <div className="ai-video-consult">
                    <div className="ai-video-main">
                        <div className="ai-doctor-screen">
                            <div className={`ai-doctor-face ${isSpeaking ? 'talking' : ''}`}>
                                <span className="ai-doctor-face-cross">+</span>
                            </div>
                            <div>
                                <strong>AI Doctor</strong>
                                <span>{callStatus}</span>
                            </div>
                        </div>
                        <div className="ai-video-timer">{callTime}</div>
                    </div>
                    <div className="ai-self-preview">
                        <video ref={localVideoRef} autoPlay muted playsInline />
                        {!cameraOn && <div className="ai-camera-off">Camera off</div>}
                    </div>
                    <div className="ai-call-controls">
                        <button type="button" className={`ai-call-btn ${micOn ? '' : 'off'}`} onClick={() => setMicOn(v => !v)} title={micOn ? 'Mute microphone' : 'Unmute microphone'}>
                            <span className={micOn ? 'icon-mic' : 'icon-mic-off'} aria-hidden="true"></span>
                        </button>
                        <button type="button" className={`ai-call-btn ${cameraOn ? '' : 'off'}`} onClick={() => setCameraOn(v => !v)} title={cameraOn ? 'Turn camera off' : 'Turn camera on'}>
                            <span className={cameraOn ? 'icon-camera' : 'icon-camera-off'} aria-hidden="true"></span>
                        </button>
                        <button type="button" className="ai-call-btn danger" onClick={stopVideoConsult} title="End AI call">
                            <span className="icon-phone" aria-hidden="true"></span>
                        </button>
                    </div>
                </div>
            )}

            <div className="pd-chat-messages ai-doctor-messages">
                {messages.map(m => (
                    <div key={m.id} className={`pd-bubble-wrap ${m.from}`}>
                        <div
                            className={`pd-bubble ${m.from}`}
                            dangerouslySetInnerHTML={{ __html: formatText(m.text) }}
                        />
                        <div className="ai-message-time">{m.time}</div>
                    </div>
                ))}
                {typing && (
                    <div className="pd-bubble ai pd-typing">
                        <span></span><span></span><span></span>
                    </div>
                )}
                <div ref={endRef} />
            </div>

            <div className="pd-quick-prompts ai-quick-prompts">
                {QUICK_PROMPTS.map(prompt => (
                    <button
                        key={prompt}
                        type="button"
                        className="pd-quick-chip"
                        onClick={() => sendMessage(prompt)}
                        disabled={typing || reportBusy}
                    >
                        {prompt}
                    </button>
                ))}
            </div>

            <div className="pd-chat-input-row ai-chat-input-row">
                {interimTranscript && (
                    <div className="ai-listening">Listening: {interimTranscript}...</div>
                )}

                <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    onChange={handleReportFile}
                />

                <button
                    type="button"
                    className="pd-chat-send ai-tool-button"
                    onClick={() => fileRef.current?.click()}
                    disabled={reportBusy}
                    aria-label="Upload report scan for OCR analysis"
                    title="Upload report scan"
                >
                    <span className="icon-upload" aria-hidden="true"></span>
                </button>

                <button
                    type="button"
                    className="pd-chat-send ai-tool-button"
                    onClick={startScanCamera}
                    disabled={reportBusy}
                    aria-label="Open camera to scan report"
                    title="Scan report with camera"
                >
                    <span className="icon-camera" aria-hidden="true"></span>
                </button>

                <textarea
                    id="ai-chat-input"
                    name="ai-chat-input"
                    className="pd-chat-input"
                    placeholder={callActive ? 'Tell the AI doctor your symptoms...' : 'Ask a health question or upload a report scan...'}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    rows={1}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                />

                <button
                    type="button"
                    className={`pd-chat-send ai-tool-button ${isRecording ? 'recording-active' : ''}`}
                    onClick={handleVoiceToggle}
                    aria-label={isRecording ? 'Stop voice recording' : 'Start voice recording'}
                    title={isRecording ? 'Stop recording' : 'Start recording'}
                >
                    <span className={isRecording ? 'icon-stop' : 'icon-mic'} aria-hidden="true"></span>
                </button>

                <button
                    type="button"
                    className="pd-chat-send ai-send-button"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || typing}
                    aria-label="Send message"
                    title="Send"
                >
                    <span className="icon-send" aria-hidden="true"></span>
                </button>
            </div>

            {scanCameraOpen && (
                <div className="ai-scan-modal" role="dialog" aria-modal="true" aria-label="Scan report with camera">
                    <div className="ai-scan-card">
                        <div className="ai-scan-head">
                            <div>
                                <strong>Scan report</strong>
                                <span>Place the full page inside the frame, then capture.</span>
                            </div>
                            <button type="button" onClick={stopScanCamera} aria-label="Close scan camera">x</button>
                        </div>
                        <div className="ai-scan-preview">
                            <video ref={scanVideoRef} autoPlay muted playsInline />
                            <div className="ai-scan-frame"></div>
                            {scanCameraError && <div className="ai-scan-error">{scanCameraError}</div>}
                        </div>
                        <div className="ai-scan-actions">
                            <button type="button" className="pd-btn pd-btn-outline" onClick={() => fileRef.current?.click()}>
                                Upload File
                            </button>
                            <button type="button" className="pd-btn pd-btn-primary" onClick={captureReportScan} disabled={reportBusy || Boolean(scanCameraError)}>
                                Capture and Analyse
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .ai-doctor-shell {
                    display: flex;
                    flex-direction: column;
                    height: calc(100vh - 120px);
                    min-height: 620px;
                    background: #fbfdfb;
                }
                .ai-doctor-header {
                    border-bottom: 1px solid #e5efe9;
                    padding-bottom: 14px;
                    gap: 16px;
                }
                .ai-doctor-title {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    min-width: 0;
                }
                .ai-doctor-avatar {
                    width: 46px;
                    height: 46px;
                    border-radius: 50%;
                    background: #e8f7ef;
                    border: 1px solid #b7e4c7;
                    color: #166534;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    flex: 0 0 46px;
                }
                .ai-doctor-avatar.speaking::after {
                    content: '';
                    position: absolute;
                    inset: -6px;
                    border-radius: 50%;
                    border: 2px solid #22c55e;
                    animation: aiPulse 1.1s ease-in-out infinite;
                }
                .ai-doctor-cross,
                .ai-doctor-face-cross {
                    font-size: 1.8rem;
                    font-weight: 800;
                    line-height: 1;
                }
                .ai-video-consult {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 180px auto;
                    gap: 12px;
                    align-items: stretch;
                    padding: 14px 18px;
                    border-bottom: 1px solid #e5efe9;
                    background: #f5fbf7;
                }
                .ai-video-main {
                    min-height: 150px;
                    border-radius: 8px;
                    background: #0f2b1a;
                    color: #fff;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .ai-doctor-screen {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                    text-align: center;
                }
                .ai-doctor-screen span {
                    display: block;
                    color: #b7e4c7;
                    font-size: 0.82rem;
                    margin-top: 4px;
                }
                .ai-doctor-face {
                    width: 74px;
                    height: 74px;
                    border-radius: 50%;
                    background: #d8f3dc;
                    color: #14532d;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 0 12px rgba(183, 228, 199, 0.12);
                }
                .ai-doctor-face.talking {
                    animation: aiTalk 900ms ease-in-out infinite;
                }
                .ai-video-timer {
                    position: absolute;
                    top: 10px;
                    right: 12px;
                    padding: 5px 10px;
                    border-radius: 999px;
                    background: rgba(255,255,255,0.12);
                    font-size: 0.78rem;
                    font-weight: 700;
                }
                .ai-self-preview {
                    position: relative;
                    width: 180px;
                    min-height: 150px;
                    border-radius: 8px;
                    overflow: hidden;
                    background: #111827;
                    border: 1px solid #d1e7da;
                }
                .ai-self-preview video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: scaleX(-1);
                }
                .ai-camera-off {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    background: #111827;
                    font-size: 0.85rem;
                }
                .ai-call-controls {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    justify-content: center;
                }
                .ai-call-btn,
                .ai-tool-button,
                .ai-send-button {
                    width: 45px !important;
                    height: 45px !important;
                    min-width: 45px;
                    border-radius: 50% !important;
                    padding: 0 !important;
                    display: inline-flex !important;
                    align-items: center;
                    justify-content: center;
                    flex: 0 0 45px;
                    box-sizing: border-box;
                }
                .ai-call-btn {
                    border: 1px solid #bbf7d0;
                    background: #fff;
                    color: #166534;
                    cursor: pointer;
                }
                .ai-call-btn.off {
                    color: #b91c1c;
                    border-color: #fecaca;
                    background: #fff5f5;
                }
                .ai-call-btn.danger {
                    color: #fff;
                    background: #dc2626;
                    border-color: #dc2626;
                }
                .ai-doctor-messages {
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    background: #fdfdfb;
                }
                .ai-doctor-messages .pd-bubble {
                    max-width: 86%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                    white-space: normal;
                }
                .ai-doctor-messages .pd-bubble.ai {
                    background: #fff;
                    color: #26352b;
                    border: 1px solid #e2e8f0;
                }
                .ai-doctor-messages .pd-bubble.user {
                    background: #166534;
                    color: #fff;
                }
                .ai-message-time {
                    font-size: 0.7rem;
                    opacity: 0.5;
                    margin-top: 4px;
                }
                .pd-bubble-wrap.user .ai-message-time {
                    text-align: right;
                }
                .ai-quick-prompts {
                    padding: 10px 20px;
                    background: #fff;
                    border-top: 1px solid #eef4f0;
                    overflow-x: auto;
                }
                .ai-chat-input-row {
                    padding: 15px 20px 20px;
                    gap: 10px;
                    position: relative;
                    background: #fff;
                    border-top: 1px solid #eee;
                }
                .ai-chat-input-row .pd-chat-input {
                    border-radius: 15px;
                    border: 1px solid #e2e8f0;
                    padding: 12px 15px;
                    min-height: 45px;
                }
                .ai-tool-button {
                    background: #f0fdf4 !important;
                    border: 1px solid #bbf7d0 !important;
                    color: #166534 !important;
                    box-shadow: 0 4px 12px rgba(22, 101, 52, 0.10) !important;
                }
                .ai-tool-button:disabled {
                    opacity: 0.55;
                    cursor: not-allowed;
                }
                .ai-send-button {
                    background: #166534 !important;
                    border: 1px solid #166534 !important;
                    color: #fff !important;
                    box-shadow: 0 5px 14px rgba(22, 101, 52, 0.24) !important;
                }
                .ai-send-button:disabled {
                    background: #9ca3af !important;
                    border-color: #9ca3af !important;
                    box-shadow: none !important;
                    opacity: 0.55;
                }
                .recording-active {
                    animation: aiPulseButton 1.2s infinite;
                    background: #ef4444 !important;
                    border-color: #ef4444 !important;
                    color: #fff !important;
                }
                .ai-listening {
                    position: absolute;
                    top: -48px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #166534;
                    color: #fff;
                    padding: 8px 20px;
                    border-radius: 20px;
                    font-size: 0.9rem;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    white-space: nowrap;
                    z-index: 10;
                }
                .ai-scan-modal {
                    position: fixed;
                    inset: 0;
                    z-index: 1100;
                    background: rgba(8, 25, 14, 0.72);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 18px;
                }
                .ai-scan-card {
                    width: min(680px, 100%);
                    background: #fff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 24px 70px rgba(0,0,0,0.28);
                }
                .ai-scan-head {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 14px;
                    padding: 14px 16px;
                    border-bottom: 1px solid #e5efe9;
                }
                .ai-scan-head strong,
                .ai-scan-head span {
                    display: block;
                }
                .ai-scan-head strong {
                    color: #14532d;
                    font-size: 1rem;
                }
                .ai-scan-head span {
                    color: #64748b;
                    font-size: 0.82rem;
                    margin-top: 2px;
                }
                .ai-scan-head button {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    border: 1px solid #dbe7df;
                    background: #fff;
                    color: #334155;
                    cursor: pointer;
                    font-size: 1rem;
                }
                .ai-scan-preview {
                    position: relative;
                    background: #0f172a;
                    aspect-ratio: 4 / 3;
                    overflow: hidden;
                }
                .ai-scan-preview video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .ai-scan-frame {
                    position: absolute;
                    inset: 10%;
                    border: 2px solid rgba(255,255,255,0.88);
                    border-radius: 6px;
                    box-shadow: 0 0 0 999px rgba(0,0,0,0.24);
                    pointer-events: none;
                }
                .ai-scan-error {
                    position: absolute;
                    left: 16px;
                    right: 16px;
                    bottom: 16px;
                    background: #fff5f5;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    padding: 10px 12px;
                    font-size: 0.86rem;
                }
                .ai-scan-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    padding: 14px 16px;
                    border-top: 1px solid #e5efe9;
                }
                .icon-video,
                .icon-camera,
                .icon-camera-off,
                .icon-mic,
                .icon-mic-off,
                .icon-phone,
                .icon-upload,
                .icon-stop,
                .icon-send {
                    position: relative;
                    display: inline-block;
                    width: 18px;
                    height: 18px;
                    color: currentColor;
                }
                .icon-video::before {
                    content: '';
                    position: absolute;
                    left: 1px;
                    top: 4px;
                    width: 11px;
                    height: 10px;
                    border: 2px solid currentColor;
                    border-radius: 3px;
                }
                .icon-video::after {
                    content: '';
                    position: absolute;
                    right: 0;
                    top: 6px;
                    border-left: 7px solid currentColor;
                    border-top: 4px solid transparent;
                    border-bottom: 4px solid transparent;
                }
                .icon-camera::before,
                .icon-camera-off::before {
                    content: '';
                    position: absolute;
                    left: 1px;
                    top: 5px;
                    width: 14px;
                    height: 10px;
                    border: 2px solid currentColor;
                    border-radius: 3px;
                }
                .icon-camera::after,
                .icon-camera-off::after {
                    content: '';
                    position: absolute;
                    left: 5px;
                    top: 1px;
                    width: 7px;
                    height: 5px;
                    border: 2px solid currentColor;
                    border-bottom: 0;
                    border-radius: 3px 3px 0 0;
                }
                .icon-camera-off {
                    transform: rotate(-28deg);
                }
                .icon-mic::before,
                .icon-mic-off::before {
                    content: '';
                    position: absolute;
                    left: 5px;
                    top: 1px;
                    width: 8px;
                    height: 12px;
                    border: 2px solid currentColor;
                    border-radius: 8px;
                    box-sizing: border-box;
                }
                .icon-mic::after,
                .icon-mic-off::after {
                    content: '';
                    position: absolute;
                    left: 3px;
                    bottom: 1px;
                    width: 12px;
                    height: 8px;
                    border: 2px solid currentColor;
                    border-top: 0;
                    border-radius: 0 0 10px 10px;
                }
                .icon-mic-off {
                    transform: rotate(-28deg);
                }
                .icon-phone::before {
                    content: '';
                    position: absolute;
                    left: 2px;
                    top: 4px;
                    width: 14px;
                    height: 9px;
                    border: 3px solid currentColor;
                    border-top: 0;
                    border-radius: 0 0 12px 12px;
                    transform: rotate(180deg);
                }
                .icon-upload::before {
                    content: '';
                    position: absolute;
                    left: 8px;
                    top: 2px;
                    width: 2px;
                    height: 11px;
                    background: currentColor;
                }
                .icon-upload::after {
                    content: '';
                    position: absolute;
                    left: 4px;
                    top: 2px;
                    width: 8px;
                    height: 8px;
                    border-left: 2px solid currentColor;
                    border-top: 2px solid currentColor;
                    transform: rotate(45deg);
                }
                .icon-stop::before {
                    content: '';
                    position: absolute;
                    inset: 3px;
                    background: currentColor;
                    border-radius: 3px;
                }
                .icon-send::before {
                    content: '';
                    position: absolute;
                    left: 3px;
                    top: 2px;
                    border-left: 14px solid currentColor;
                    border-top: 7px solid transparent;
                    border-bottom: 7px solid transparent;
                }
                @keyframes aiPulse {
                    0%, 100% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.12); opacity: 0.35; }
                }
                @keyframes aiTalk {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes aiPulseButton {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50% { transform: translateY(-1px) scale(1.04); }
                }
                @media (max-width: 760px) {
                    .ai-doctor-shell {
                        min-height: 680px;
                    }
                    .ai-doctor-header {
                        align-items: flex-start;
                    }
                    .ai-video-consult {
                        grid-template-columns: 1fr;
                    }
                    .ai-self-preview {
                        width: 100%;
                        height: 150px;
                    }
                    .ai-call-controls {
                        flex-direction: row;
                    }
                    .ai-doctor-messages .pd-bubble {
                        max-width: 94%;
                    }
                }
            `}</style>
        </div>
    );
}
