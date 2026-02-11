import { useState } from 'react'
import { Check, Sparkles, Zap, Crown, X } from 'lucide-react'
import styles from './PremiumPage.module.css'
import PlanRequestModal from '../components/PlanRequestModal/PlanRequestModal'

function PremiumPage() {
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [showModal, setShowModal] = useState(false)

    const ironPlan = {
        id: 'iron',
        name: 'Iron',
        icon: Sparkles,
        tagline: 'Current Plan',
        description: 'Your default starting experience on Beats',
        features: [
            'API service with 30-second previews',
            'Standard quality audio',
            'Basic music streaming'
        ],
        limitations: [
            'No Google Drive integration',
            'No full song playback',
            'Limited to 30-second previews'
        ]
    }

    const upgradePlans = [
        {
            id: 'gold',
            name: 'Gold',
            icon: Zap,
            tagline: 'Most Popular',
            description: 'Enhanced experience with premium features',
            popular: true,
            features: [
                'Google Drive integration',
                'Full song playback',
                'High quality audio',
                'Time-limited premium access'
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
            description: 'The complete premium Beats experience',
            features: [
                'Unlimited Google Drive access',
                'Full song playback forever',
                'Very high quality audio',
                'No time restrictions',
                'Priority support',
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
                <h2 className={styles.sectionTitle}>Your Plan Options</h2>

                {/* Iron - Current Default Plan */}
                <div className={styles.defaultPlanBanner}>
                    <div className={styles.defaultPlanContent}>
                        <div className={styles.defaultPlanHeader}>
                            <div className={styles.defaultPlanIcon}>
                                <Sparkles size={40} />
                            </div>
                            <div>
                                <h3 className={styles.defaultPlanName}>{ironPlan.name} Plan</h3>
                                <p className={styles.defaultPlanTagline}>{ironPlan.tagline}</p>
                            </div>
                        </div>
                        <p className={styles.defaultPlanDescription}>{ironPlan.description}</p>

                        <div className={styles.defaultPlanDetails}>
                            <div className={styles.defaultPlanColumn}>
                                <h4>Included:</h4>
                                <ul>
                                    {ironPlan.features.map((feature, index) => (
                                        <li key={index}>
                                            <Check size={16} className={styles.checkIcon} />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className={styles.defaultPlanColumn}>
                                <h4>Limitations:</h4>
                                <ul className={styles.limitations}>
                                    {ironPlan.limitations.map((limitation, index) => (
                                        <li key={index}>
                                            <X size={16} className={styles.xIcon} />
                                            <span>{limitation}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upgrade Options */}
                <h3 className={styles.upgradeTitle}>Upgrade to Premium</h3>
                <div className={styles.upgradeGrid}>
                    {upgradePlans.map((plan) => {
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
                                    <h4>Premium Features:</h4>
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
                                            <h4 className={styles.limitationsTitle}>Note:</h4>
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
                                    Request {plan.name}
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
