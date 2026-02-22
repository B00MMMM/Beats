import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertCircle, CheckCircle, Loader } from 'lucide-react'
import styles from './PlanRequestModal.module.css'
import axios from '../../api/axios'
import { useAuth } from '@clerk/clerk-react'

function PlanRequestModal({ plan, onClose }) {
    const { getToken } = useAuth()
    const [explanation, setExplanation] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    const planNames = {
        iron: 'Iron',
        gold: 'Gold',
        diamond: 'Diamond'
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (explanation.trim().length < 20) {
            setError('Please provide at least 20 characters explaining why you need this plan.')
            return
        }

        if (explanation.trim().length > 500) {
            setError('Explanation must be less than 500 characters.')
            return
        }

        setLoading(true)
        setError('')

        try {
            const token = await getToken()
            await axios.post('/plans/request', {
                requestedPlan: plan,
                explanation: explanation.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            })

            setSuccess(true)
            setTimeout(() => {
                onClose()
            }, 2000)
        } catch (err) {
            console.error('Error submitting plan request:', err)
            setError(err.response?.data?.message || 'Failed to submit request. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return createPortal(
            <div className={styles.modalOverlay} onClick={onClose}>
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.successContent}>
                        <CheckCircle size={64} className={styles.successIcon} />
                        <h2>Request Submitted!</h2>
                        <p>Your request for the {planNames[plan]} plan has been submitted successfully.</p>
                        <p className={styles.successNote}>
                            We'll review your request and get back to you soon. You'll be notified once your plan is approved.
                        </p>
                    </div>
                </div>
            </div>,
            document.body
        )
    }

    return createPortal(
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={24} />
                </button>

                <div className={styles.modalHeader}>
                    <h2>Request {planNames[plan]} Plan</h2>
                    <p>Tell us why you'd like to upgrade to the {planNames[plan]} plan</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="explanation">Why do you need this plan?</label>
                        <textarea
                            id="explanation"
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            placeholder="Explain your use case, how you plan to use Beats, and why this plan fits your needs..."
                            rows={6}
                            maxLength={500}
                            required
                        />
                        <div className={styles.charCount}>
                            {explanation.length}/500 characters {explanation.length < 20 && '(minimum 20)'}
                        </div>
                    </div>

                    {error && (
                        <div className={styles.error}>
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className={styles.infoBox}>
                        <AlertCircle size={18} />
                        <div>
                            <strong>Please note:</strong>
                            <p>
                                Your request will be reviewed by our team. Approval may take some time.
                                You'll receive a notification once your request is processed.
                            </p>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading || explanation.trim().length < 20}
                    >
                        {loading ? (
                            <>
                                <Loader size={18} className={styles.spinner} />
                                Processing...
                            </>
                        ) : (
                            'Submit Request'
                        )}
                    </button>
                </form>
            </div>
        </div>,
        document.body
    )
}

export default PlanRequestModal
