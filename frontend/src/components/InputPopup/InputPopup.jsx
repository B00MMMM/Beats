import { X } from 'lucide-react'
import { useState } from 'react'
import styles from './InputPopup.module.css'

function InputPopup({
    isOpen,
    onClose,
    onSubmit,
    title = 'Input Required',
    message = 'Please enter a value:',
    placeholder = '',
    submitText = 'Submit',
    cancelText = 'Cancel',
    defaultValue = ''
}) {
    const [value, setValue] = useState(defaultValue)

    if (!isOpen) return null

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(value)
        onClose()
    }

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.popup} onClick={e => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={18} />
                </button>

                <div className={styles.content}>
                    <h3 className={styles.title}>{title}</h3>
                    <p className={styles.message}>{message}</p>

                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            className={styles.input}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            placeholder={placeholder}
                            autoFocus
                        />

                        <div className={styles.actions}>
                            <button
                                type="button"
                                className={styles.cancelButton}
                                onClick={onClose}
                            >
                                {cancelText}
                            </button>
                            <button
                                type="submit"
                                className={styles.submitButton}
                            >
                                {submitText}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default InputPopup
