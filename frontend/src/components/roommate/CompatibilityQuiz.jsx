import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../common/LoadingSpinner';
import Toast from '../common/Toast';
import axios from 'axios';
import './CompatibilityQuiz.css';

function CompatibilityQuiz({ onComplete, existingAnswers = null }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState(existingAnswers || {});
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

    const questions = [
        {
            id: 'cleanliness',
            category: 'Living Habits',
            question: 'How would you describe your cleanliness level?',
            type: 'scale',
            options: [
                { value: 1, label: 'Very messy', emoji: '🙈' },
                { value: 2, label: 'Somewhat messy', emoji: '😅' },
                { value: 3, label: 'Average', emoji: '😊' },
                { value: 4, label: 'Pretty clean', emoji: '😌' },
                { value: 5, label: 'Very clean', emoji: '✨' }
            ]
        },
        {
            id: 'noise_level',
            category: 'Living Habits',
            question: 'What\'s your preferred noise level at home?',
            type: 'scale',
            options: [
                { value: 1, label: 'Love it loud', emoji: '🎵' },
                { value: 2, label: 'Some noise is fine', emoji: '🎶' },
                { value: 3, label: 'Moderate', emoji: '🤫' },
                { value: 4, label: 'Prefer quiet', emoji: '🤐' },
                { value: 5, label: 'Need silence', emoji: '🔇' }
            ]
        },
        {
            id: 'social_level',
            category: 'Social Preferences',
            question: 'How social are you at home?',
            type: 'scale',
            options: [
                { value: 1, label: 'Always having friends over', emoji: '🎉' },
                { value: 2, label: 'Regular social gatherings', emoji: '🍕' },
                { value: 3, label: 'Occasional hangouts', emoji: '😊' },
                { value: 4, label: 'Prefer small groups', emoji: '👥' },
                { value: 5, label: 'Like to keep to myself', emoji: '📚' }
            ]
        },
        {
            id: 'sleep_schedule',
            category: 'Lifestyle',
            question: 'What\'s your typical sleep schedule?',
            type: 'multiple',
            options: [
                { value: 'early_bird', label: 'Early bird (bed by 10pm, up by 7am)', emoji: '🌅' },
                { value: 'normal', label: 'Normal schedule (bed by 11pm, up by 8am)', emoji: '😴' },
                { value: 'night_owl', label: 'Night owl (bed after midnight)', emoji: '🦉' },
                { value: 'irregular', label: 'Irregular/varies by day', emoji: '🔄' }
            ]
        },
        {
            id: 'study_habits',
            category: 'Academic',
            question: 'Where do you prefer to study?',
            type: 'multiple',
            options: [
                { value: 'bedroom', label: 'In my bedroom', emoji: '🛏️' },
                { value: 'common_area', label: 'Common areas at home', emoji: '🏠' },
                { value: 'library', label: 'Library/campus', emoji: '📚' },
                { value: 'coffee_shops', label: 'Coffee shops/cafes', emoji: '☕' },
                { value: 'group_study', label: 'Group study sessions', emoji: '👥' }
            ]
        },
        {
            id: 'cooking_habits',
            category: 'Kitchen & Food',
            question: 'How often do you cook at home?',
            type: 'multiple',
            options: [
                { value: 'daily', label: 'Daily - I love cooking!', emoji: '👨‍🍳' },
                { value: 'few_times_week', label: 'A few times a week', emoji: '🍳' },
                { value: 'occasionally', label: 'Occasionally/weekends', emoji: '🥘' },
                { value: 'rarely', label: 'Rarely - mostly takeout', emoji: '🍕' },
                { value: 'meal_prep', label: 'Meal prep on Sundays', emoji: '📦' }
            ]
        },
        {
            id: 'sharing_comfort',
            category: 'Sharing',
            question: 'How comfortable are you with sharing household items?',
            type: 'multiple',
            options: [
                { value: 'everything', label: 'Happy to share everything', emoji: '🤝' },
                { value: 'kitchen_items', label: 'Kitchen items and cleaning supplies', emoji: '🍽️' },
                { value: 'basic_items', label: 'Just basic items (toilet paper, etc.)', emoji: '🧻' },
                { value: 'prefer_separate', label: 'Prefer to keep things separate', emoji: '🚪' }
            ]
        },
        {
            id: 'pet_preference',
            category: 'Pets & Allergies',
            question: 'What\'s your stance on pets?',
            type: 'multiple',
            options: [
                { value: 'love_pets', label: 'Love pets, have/want some', emoji: '🐕' },
                { value: 'ok_with_pets', label: 'Fine with roommate\'s pets', emoji: '🐱' },
                { value: 'no_preference', label: 'No preference either way', emoji: '🤷‍♂️' },
                { value: 'prefer_no_pets', label: 'Prefer no pets', emoji: '🚫' },
                { value: 'allergic', label: 'Allergic to certain animals', emoji: '🤧' }
            ]
        },
        {
            id: 'budget_range',
            category: 'Financial',
            question: 'What\'s your monthly budget for rent/housing?',
            type: 'multiple',
            options: [
                { value: 'under_500', label: 'Under $500', emoji: '💸' },
                { value: '500_800', label: '$500 - $800', emoji: '💰' },
                { value: '800_1200', label: '$800 - $1200', emoji: '💵' },
                { value: '1200_1600', label: '$1200 - $1600', emoji: '💴' },
                { value: 'over_1600', label: 'Over $1600', emoji: '💎' }
            ]
        },
        {
            id: 'deal_breakers',
            category: 'Deal Breakers',
            question: 'Which of these would be deal breakers for you?',
            type: 'checkbox',
            options: [
                { value: 'smoking', label: 'Smoking indoors', emoji: '🚬' },
                { value: 'heavy_drinking', label: 'Heavy drinking/partying', emoji: '🍺' },
                { value: 'overnight_guests', label: 'Frequent overnight guests', emoji: '🛏️' },
                { value: 'loud_music', label: 'Loud music/TV', emoji: '🔊' },
                { value: 'messy_common_areas', label: 'Messy common areas', emoji: '🗑️' },
                { value: 'different_schedules', label: 'Very different schedules', emoji: '⏰' },
                { value: 'no_communication', label: 'Poor communication', emoji: '📵' }
            ]
        }
    ];

    const handleAnswer = (questionId, value) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: value
        }));
    };

    const handleNext = () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleSubmit();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await axios.post('/roommate-preferences', {
                preferences: answers
            });

            showToast('Compatibility quiz completed! 🎉', 'success');
            
            if (onComplete) {
                onComplete(answers);
            } else {
                setTimeout(() => {
                    navigate('/roommates');
                }, 1500);
            }
        } catch (error) {
            console.error('Error saving preferences:', error);
            showToast('Error saving your preferences. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    const closeToast = () => {
        setToast({ show: false, message: '', type: 'info' });
    };

    const currentQuestion = questions[currentStep];
    const progress = ((currentStep + 1) / questions.length) * 100;
    const currentAnswer = answers[currentQuestion.id];
    const canProceed = currentAnswer !== undefined && currentAnswer !== null && 
        (currentQuestion.type !== 'checkbox' || (Array.isArray(currentAnswer) && currentAnswer.length > 0));

    return (
        <div className="compatibility-quiz">
            <div className="quiz-container">
                {/* Progress Header */}
                <div className="quiz-header">
                    <div className="progress-info">
                        <h2>Compatibility Quiz</h2>
                        <p>Question {currentStep + 1} of {questions.length}</p>
                    </div>
                    <div className="progress-bar">
                        <div 
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Question Card */}
                <div className="question-card">
                    <div className="question-category">
                        {currentQuestion.category}
                    </div>
                    <h3 className="question-text">
                        {currentQuestion.question}
                    </h3>

                    {/* Answer Options */}
                    <div className="answer-options">
                        {currentQuestion.type === 'scale' && (
                            <div className="scale-options">
                                {currentQuestion.options.map((option) => (
                                    <button
                                        key={option.value}
                                        className={`scale-option ${currentAnswer === option.value ? 'selected' : ''}`}
                                        onClick={() => handleAnswer(currentQuestion.id, option.value)}
                                    >
                                        <span className="option-emoji">{option.emoji}</span>
                                        <span className="option-label">{option.label}</span>
                                        <span className="option-value">{option.value}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {currentQuestion.type === 'multiple' && (
                            <div className="multiple-options">
                                {currentQuestion.options.map((option) => (
                                    <button
                                        key={option.value}
                                        className={`multiple-option ${currentAnswer === option.value ? 'selected' : ''}`}
                                        onClick={() => handleAnswer(currentQuestion.id, option.value)}
                                    >
                                        <span className="option-emoji">{option.emoji}</span>
                                        <span className="option-label">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {currentQuestion.type === 'checkbox' && (
                            <div className="checkbox-options">
                                {currentQuestion.options.map((option) => {
                                    const isChecked = Array.isArray(currentAnswer) && currentAnswer.includes(option.value);
                                    return (
                                        <button
                                            key={option.value}
                                            className={`checkbox-option ${isChecked ? 'selected' : ''}`}
                                            onClick={() => {
                                                const currentValues = Array.isArray(currentAnswer) ? currentAnswer : [];
                                                const newValues = isChecked
                                                    ? currentValues.filter(v => v !== option.value)
                                                    : [...currentValues, option.value];
                                                handleAnswer(currentQuestion.id, newValues);
                                            }}
                                        >
                                            <span className="option-checkbox">
                                                {isChecked ? '✅' : '⬜'}
                                            </span>
                                            <span className="option-emoji">{option.emoji}</span>
                                            <span className="option-label">{option.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <div className="quiz-navigation">
                    <button
                        className="nav-btn secondary"
                        onClick={handlePrevious}
                        disabled={currentStep === 0}
                    >
                        ← Previous
                    </button>

                    <div className="nav-info">
                        {currentStep === questions.length - 1 ? (
                            <span className="completion-text">Ready to find your perfect roommate! 🎯</span>
                        ) : (
                            <span className="progress-text">{Math.round(progress)}% Complete</span>
                        )}
                    </div>

                    <button
                        className="nav-btn primary"
                        onClick={handleNext}
                        disabled={!canProceed || loading}
                    >
                        {loading ? (
                            <>
                                <LoadingSpinner size="small" />
                                Saving...
                            </>
                        ) : currentStep === questions.length - 1 ? (
                            'Complete Quiz ✨'
                        ) : (
                            'Next →'
                        )}
                    </button>
                </div>

                {/* Skip Option */}
                {currentStep < questions.length - 1 && (
                    <div className="skip-option">
                        <button
                            className="skip-btn"
                            onClick={handleNext}
                        >
                            Skip this question
                        </button>
                    </div>
                )}
            </div>

            {/* Toast Notifications */}
            {toast.show && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={closeToast}
                    position="top-right"
                />
            )}
        </div>
    );
}

export default CompatibilityQuiz;
