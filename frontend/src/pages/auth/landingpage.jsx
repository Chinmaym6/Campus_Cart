import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "./landingpage.css";

function Landing() {
    const navigate = useNavigate();

    useEffect(() => {
        // Scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px",
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                }
            });
        }, observerOptions);

        const fadeElements = document.querySelectorAll(".fade-in");
        fadeElements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return (
        <>
            {/* Hero Section */}
            <div className="landing-container">
                <div className="landing-content fade-in">
                    <h1 className="landing-title">Welcome to Campus Cart</h1>
                    <p className="landing-subtitle">
                        Your one-stop marketplace for university students. Buy, sell, and connect with your campus community.
                    </p>
                    <div className="button-container">
                        <button
                            className="landing-button login-button"
                            onClick={() => navigate("/login")}
                        >
                            Login
                        </button>
                        <button
                            className="landing-button register-button"
                            onClick={() => navigate("/register")}
                        >
                            Register
                        </button>
                    </div>
                </div>
            </div>

            {/* About Section */}
            <section className="about-section fade-in">
                <h2>What is Campus Cart?</h2>
                <div className="about-content">
                    <div className="about-text">
                        <p>
                            Campus Cart is the ultimate platform designed specifically for university students to buy, sell, and trade items within their campus community.
                        </p>
                        <p>
                            Whether you're looking for textbooks, furniture, electronics, or even finding roommates, Campus Cart connects you with fellow students in a safe and trusted environment.
                        </p>
                    </div>
                    <div className="about-illustration">
                        <div className="about-icon">🎓</div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works fade-in">
                <h2>How It Works</h2>
                <div className="how-steps-container">
                    <div className="how-step fade-in">
                        <div className="step-icon">📝</div>
                        <h3>Sign Up</h3>
                        <p>Create your free account using your email address. Join your campus community in seconds.</p>
                    </div>
                    <div className="how-step fade-in">
                        <div className="step-icon">🔍</div>
                        <h3>Post or Browse</h3>
                        <p>List items for sale with photos and descriptions, or explore what other students are selling on campus.</p>
                    </div>
                    <div className="how-step fade-in">
                        <div className="step-icon">🤝</div>
                        <h3>Meet & Exchange</h3>
                        <p>Connect with fellow students through our secure messaging system and arrange safe exchanges on campus.</p>
                    </div>
                </div>
            </section>
        </>
    );
}

export default Landing;
