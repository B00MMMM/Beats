import { useState } from 'react'
import { Check, Sparkles, Zap, Crown, X } from 'lucide-react'
import styles from './PremiumPage.module.css'
import PlanRequestModal from '../components/PlanRequestModal/PlanRequestModal'

function PremiumPage() {
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [showModal, setShowModal] = useState(false)

    const plans = [
        {
            id: 'iron',
            name: 'Iron',
            icon: Sparkles,
            tagline: 'Get Started',
            description: 'Perfect for casual listeners',
            features: [
                'API service access',
                '30-second song previews',
                'Basic playlist features',
                'Friend sharing',
                'Standard quality audio'
            ],
            limitations: [
                'No Google Drive integration',
                'Limited preview time',
                'No full song playback'
            ]
        },
        {
            id: 'gold',
            name: 'Gold',
            icon: Zap,
            tagline: 'Most Popular',
            description: 'Enhanced experience for active users',
            popular: true,
            features: [
                'Everything in Iron',
                'Google Drive integration',
                'Full song playback',
                'Time-limited premium access',
                'High quality audio',
                'Advanced playlist features',
                'Group chat features'
            ],
            limitations: [
                'Time-restricted access period'
            ]
        },
        {
            id: 'diamond',
            name: 'Diamond',
            icon: Crown,
            tagline: 'Ultimate Experience',
            description: 'The complete Beats experience',
            features: [
                'Everything in Gold',
                'Unlimited access period',
                'No time restrictions',
                'Priority support',
                'Exclusive features',
                'Very high quality audio',
                'Early access to new features'
            ],
            limitations: []
        }
    ]

    const handlePlanSelect = (planId) => {
        setSelectedPlan(planId)
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setSelectedPlan(null)
    }

    return (
        <div className={styles.premiumPage}>
            {/* Hero Section */}
            <div className={styles.hero}>
                <div className={styles.heroContent}>
                    <h1 className={styles.heroTitle}>
                        Elevate Your Music Experience
                    </h1>
                    <p className={styles.heroSubtitle}>
                        Choose the perfect plan for your listening needs. Request an upgrade and unlock premium features.
                    </p>
                    <div className={styles.heroBadge}>
                        <Sparkles size={16} />
                        <span>No payment required - Just approval</span>
                    </div>
                </div>
            </div>

            {/* About Section */}
            <div className={styles.about}>
                <h2>Why Upgrade?</h2>
                <p>
                    Beats offers three distinct tiers designed to match your listening style.
                    From basic API access to unlimited premium features with Google Drive integration,
                    we've got you covered. Simply request your desired plan and wait for approval.
                </p>
            </div>

            {/* Plans Section */}
            <div className={styles.plansSection}>
                <h2 className={styles.sectionTitle}>Choose Your Plan</h2>
                <div className={styles.plansGrid}>
                    {plans.map((plan) => {
                        const Icon = plan.icon
                        return (
                            <div
                                key={plan.id}
                                className={`${styles.planCard} ${plan.popular ? styles.popular : ''}`}
                            >
                                {plan.popular && (
                                    <div className={styles.popularBadge}>
                                        <Sparkles size={14} />
                                        <span>Most Popular</span>
                                    </div>
                                )}
                                <div className={styles.planHeader}>
                                    <div className={styles.planIcon}>
                                        <Icon size={32} />
                                    </div>
                                    <h3 className={styles.planName}>{plan.name}</h3>
                                    <p className={styles.planTagline}>{plan.tagline}</p>
                                    <p className={styles.planDescription}>{plan.description}</p>
                                </div>

                                <div className={styles.planFeatures}>
                                    <h4>What you'll get:</h4>
                                    <ul>
                                        {plan.features.map((feature, index) => (
                                            <li key={index}>
                                                <Check size={16} className={styles.checkIcon} />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {plan.limitations.length > 0 && (
                                        <>
                                            <h4 className={styles.limitationsTitle}>Limitations:</h4>
                                            <ul className={styles.limitations}>
                                                {plan.limitations.map((limitation, index) => (
                                                    <li key={index}>
                                                        <X size={16} className={styles.xIcon} />
                                                        <span>{limitation}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </div>

                                <button
                                    className={styles.planButton}
                                    onClick={() => handlePlanSelect(plan.id)}
                                >
                                    Get {plan.name}
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Comparison Table */}
            <div className={styles.comparisonSection}>
                <h2 className={styles.sectionTitle}>Compare Plans</h2>
                <div className={styles.tableWrapper}>
                    <table className={styles.comparisonTable}>
                        <thead>
                            <tr>
                                <th>Feature</th>
                                <th>Iron</th>
                                <th>Gold</th>
                                <th>Diamond</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>API Service Access</td>
                                <td><Check size={20} /></td>
                                <td><Check size={20} /></td>
                                <td><Check size={20} /></td>
                            </tr>
                            <tr>
                                <td>Song Previews</td>
                                <td>30 seconds</td>
                                <td>Full songs</td>
                                <td>Full songs</td>
                            </tr>
                            <tr>
                                <td>Google Drive Integration</td>
                                <td><X size={20} /></td>
                                <td><Check size={20} /></td>
                                <td><Check size={20} /></td>
                            </tr>
                            <tr>
                                <td>Access Duration</td>
                                <td>Unlimited</td>
                                <td>Time-limited</td>
                                <td>Unlimited</td>
                            </tr>
                            <tr>
                                <td>Audio Quality</td>
                                <td>Standard</td>
                                <td>High</td>
                                <td>Very High</td>
                            </tr>
                            <tr>
                                <td>Group Chat</td>
                                <td><Check size={20} /></td>
                                <td><Check size={20} /></td>
                                <td><Check size={20} /></td>
                            </tr>
                            <tr>
                                <td>Priority Support</td>
                                <td><X size={20} /></td>
                                <td><X size={20} /></td>
                                <td><Check size={20} /></td>
                            </tr>
                            <tr>
                                <td>Early Feature Access</td>
                                <td><X size={20} /></td>
                                <td><X size={20} /></td>
                                <td><Check size={20} /></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <PlanRequestModal
                    plan={selectedPlan}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    )
}

export default PremiumPage
