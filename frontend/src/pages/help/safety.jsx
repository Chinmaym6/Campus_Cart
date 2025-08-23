import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import './safety.css';

function SafetyPage() {
    const [activeSection, setActiveSection] = useState('general');

    const safetyTips = {
        general: [
            {
                title: 'Trust Your Instincts',
                description: 'If something feels off about a person or situation, trust your gut feeling and avoid the interaction.',
                icon: '🎯'
            },
            {
                title: 'Verify Identity',
                description: 'Look for verified student badges and check user profiles thoroughly before engaging.',
                icon: '✅'
            },
            {
                title: 'Keep Personal Info Private',
                description: 'Never share sensitive information like your full address, financial details, or passwords.',
                icon: '🔒'
            },
            {
                title: 'Use Campus Cart Messaging',
                description: 'Keep initial conversations within our platform before moving to external communication.',
                icon: '💬'
            }
        ],
        meetings: [
            {
                title: 'Meet in Public Places',
                description: 'Always arrange to meet in well-lit, busy public areas like campus centers, libraries, or coffee shops.',
                icon: '🏢'
            },
            {
                title: 'Bring a Friend',
                description: 'Consider bringing a trusted friend along, especially for high-value transactions.',
                icon: '👥'
            },
            {
                title: 'Meet During Daylight',
                description: 'Schedule meetings during daylight hours when there are more people around.',
                icon: '☀️'
            },
            {
                title: 'Tell Someone Your Plans',
                description: 'Always let a friend or family member know where you\'re going and when you expect to return.',
                icon: '📱'
            },
            {
                title: 'Stay Alert',
                description: 'Avoid distractions like headphones or excessive phone use during meetings.',
                icon: '👀'
            }
        ],
        online: [
            {
                title: 'Secure Passwords',
                description: 'Use strong, unique passwords and enable two-factor authentication on your account.',
                icon: '🔐'
            },
            {
                title: 'Beware of Scams',
                description: 'Be suspicious of deals that seem too good to be true or requests for advance payments.',
                icon: '⚠️'
            },
            {
                title: 'Verify Payment Methods',
                description: 'Use secure payment methods and be wary of unusual payment requests.',
                icon: '💳'
            },
            {
                title: 'Report Suspicious Activity',
                description: 'Report any suspicious behavior or potential scams to our support team immediately.',
                icon: '🚨'
            }
        ],
        roommate: [
            {
                title: 'Video Chat First',
                description: 'Have a video call before meeting in person to verify identity and get a feel for compatibility.',
                icon: '📹'
            },
            {
                title: 'Check References',
                description: 'Ask for and check references from previous roommates or landlords when possible.',
                icon: '📋'
            },
            {
                title: 'Visit During Different Times',
                description: 'Visit potential living spaces at different times of day to get a complete picture.',
                icon: '🕐'
            },
            {
                title: 'Discuss Boundaries',
                description: 'Have clear conversations about expectations, boundaries, and house rules upfront.',
                icon: '🗣️'
            },
            {
                title: 'Trust the Process',
                description: 'Take your time with the decision - rushing into living arrangements can lead to problems.',
                icon: '⏰'
            }
        ]
    };

    const emergencyContacts = [
        {
            service: 'Campus Security',
            number: 'Your Campus Number',
            description: 'For immediate campus-related emergencies'
        },
        {
            service: 'Local Police',
            number: '911',
            description: 'For serious emergencies requiring immediate response'
        },
        {
            service: 'Campus Cart Support',
            number: 'support@campuscart.com',
            description: 'For platform-related safety concerns'
        }
    ];

    const redFlags = [
        {
            flag: 'Pressure to meet immediately',
            description: 'Legitimate users understand the need for safety precautions'
        },
        {
            flag: 'Unwillingness to verify identity',
            description: 'Genuine students should be comfortable with reasonable verification'
        },
        {
            flag: 'Asking for personal information',
            description: 'Be wary of requests for addresses, financial info, or passwords'
        },
        {
            flag: 'Prices too good to be true',
            description: 'Extremely low prices may indicate scams or stolen goods'
        },
        {
            flag: 'Poor communication',
            description: 'Vague responses, poor grammar, or evasive answers can be warning signs'
        },
        {
            flag: 'Payment irregularities',
            description: 'Unusual payment methods or advance payment requests'
        }
    ];

    return (
        <>
            <Helmet>
                <title>Safety Guidelines - Campus Cart Help</title>
                <meta name="description" content="Stay safe while using Campus Cart. Learn about meeting safely, avoiding scams, and protecting your personal information." />
            </Helmet>

            <div className="safety-page">
                <div className="safety-container">
                    {/* Header */}
                    <div className="safety-header">
                        <h1>🛡️ Safety First</h1>
                        <p>Your safety is our top priority. Follow these guidelines to stay safe while using Campus Cart.</p>
                    </div>

                    {/* Quick Safety Banner */}
                    <div className="safety-banner">
                        <div className="banner-content">
                            <div className="banner-icon">🚨</div>
                            <div className="banner-text">
                                <h3>Emergency?</h3>
                                <p>If you're in immediate danger, call 911 or campus security immediately.</p>
                            </div>
                            <div className="banner-actions">
                                <a href="tel:911" className="emergency-btn">📞 Call 911</a>
                            </div>
                        </div>
                    </div>

                    <div className="safety-content">
                        {/* Navigation Tabs */}
                        <div className="safety-nav">
                            <button 
                                className={`nav-btn ${activeSection === 'general' ? 'active' : ''}`}
                                onClick={() => setActiveSection('general')}
                            >
                                🛡️ General Safety
                            </button>
                            <button 
                                className={`nav-btn ${activeSection === 'meetings' ? 'active' : ''}`}
                                onClick={() => setActiveSection('meetings')}
                            >
                                🤝 Safe Meetings
                            </button>
                            <button 
                                className={`nav-btn ${activeSection === 'online' ? 'active' : ''}`}
                                onClick={() => setActiveSection('online')}
                            >
                                💻 Online Safety
                            </button>
                            <button 
                                className={`nav-btn ${activeSection === 'roommate' ? 'active' : ''}`}
                                onClick={() => setActiveSection('roommate')}
                            >
                                🏠 Roommate Safety
                            </button>
                        </div>

                        {/* Safety Tips Content */}
                        <div className="safety-tips-section">
                            <h2>
                                {activeSection === 'general' && '🛡️ General Safety Guidelines'}
                                {activeSection === 'meetings' && '🤝 Meeting Safely'}
                                {activeSection === 'online' && '💻 Online Safety'}
                                {activeSection === 'roommate' && '🏠 Roommate Safety'}
                            </h2>
                            
                            <div className="tips-grid">
                                {safetyTips[activeSection].map((tip, index) => (
                                    <div key={index} className="tip-card">
                                        <div className="tip-icon">{tip.icon}</div>
                                        <div className="tip-content">
                                            <h4>{tip.title}</h4>
                                            <p>{tip.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Red Flags Section */}
                        <div className="red-flags-section">
                            <h2>🚩 Red Flags to Watch For</h2>
                            <p>Be alert for these warning signs that may indicate potential problems:</p>
                            
                            <div className="red-flags-list">
                                {redFlags.map((item, index) => (
                                    <div key={index} className="red-flag-item">
                                        <div className="flag-icon">🚩</div>
                                        <div className="flag-content">
                                            <h4>{item.flag}</h4>
                                            <p>{item.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Emergency Contacts */}
                        <div className="emergency-contacts-section">
                            <h2>📞 Emergency Contacts</h2>
                            <p>Keep these important numbers handy:</p>
                            
                            <div className="contacts-grid">
                                {emergencyContacts.map((contact, index) => (
                                    <div key={index} className="contact-card">
                                        <h4>{contact.service}</h4>
                                        <div className="contact-number">{contact.number}</div>
                                        <p>{contact.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Reporting Section */}
                        <div className="reporting-section">
                            <h2>🚨 Report Safety Concerns</h2>
                            <p>If you encounter any safety issues or suspicious behavior on Campus Cart:</p>
                            
                            <div className="reporting-steps">
                                <div className="step">
                                    <div className="step-number">1</div>
                                    <div className="step-content">
                                        <h4>Document the Issue</h4>
                                        <p>Take screenshots of conversations, listings, or profiles if safe to do so</p>
                                    </div>
                                </div>
                                
                                <div className="step">
                                    <div className="step-number">2</div>
                                    <div className="step-content">
                                        <h4>Report Immediately</h4>
                                        <p>Use our in-app reporting feature or contact support directly</p>
                                    </div>
                                </div>
                                
                                <div className="step">
                                    <div className="step-number">3</div>
                                    <div className="step-content">
                                        <h4>Follow Up</h4>
                                        <p>Our team will investigate and take appropriate action within 24 hours</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="reporting-actions">
                                <Link to="/help/contact" className="btn primary">
                                    📧 Report an Issue
                                </Link>
                                <a href="mailto:safety@campuscart.com" className="btn secondary">
                                    ✉️ Email Safety Team
                                </a>
                            </div>
                        </div>

                        {/* Safety Checklist */}
                        <div className="safety-checklist-section">
                            <h2>✅ Pre-Meeting Safety Checklist</h2>
                            <p>Use this checklist before meeting anyone from Campus Cart:</p>
                            
                            <div className="checklist">
                                <label className="checklist-item">
                                    <input type="checkbox" />
                                    <span className="checkmark">✓</span>
                                    <span className="checklist-text">Verified the person's student status and profile</span>
                                </label>
                                
                                <label className="checklist-item">
                                    <input type="checkbox" />
                                    <span className="checkmark">✓</span>
                                    <span className="checklist-text">Chosen a public meeting location</span>
                                </label>
                                
                                <label className="checklist-item">
                                    <input type="checkbox" />
                                    <span className="checkmark">✓</span>
                                    <span className="checklist-text">Told someone where I'm going and when I'll return</span>
                                </label>
                                
                                <label className="checklist-item">
                                    <input type="checkbox" />
                                    <span className="checkmark">✓</span>
                                    <span className="checklist-text">Planned to meet during daylight hours</span>
                                </label>
                                
                                <label className="checklist-item">
                                    <input type="checkbox" />
                                    <span className="checkmark">✓</span>
                                    <span className="checklist-text">Have my phone charged and emergency contacts ready</span>
                                </label>
                                
                                <label className="checklist-item">
                                    <input type="checkbox" />
                                    <span className="checkmark">✓</span>
                                    <span className="checklist-text">Reviewed the item/agreement details beforehand</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default SafetyPage;
