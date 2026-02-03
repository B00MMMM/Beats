import { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ScrollableSection.module.css';

function ScrollableSection({ title, children, rows = 1 }) {
    const containerRef = useRef(null);
    const [showLeft, setShowLeft] = useState(false);
    const [showRight, setShowRight] = useState(true);
    const [isHoveringArrow, setIsHoveringArrow] = useState(false);

    const checkScroll = () => {
        if (!containerRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
        setShowLeft(scrollLeft > 0);
        // Tolerance of 1px for float calcs
        setShowRight(scrollLeft + clientWidth < scrollWidth - 1);
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [children]); // Re-check when children change

    const scroll = (direction) => {
        if (!containerRef.current) return;
        const { clientWidth } = containerRef.current;
        const scrollAmount = direction === 'left' ? -clientWidth : clientWidth;

        containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });

        // Check after generic timeout for animation
        setTimeout(checkScroll, 300);
    };

    return (
        <section className={styles.section}>
            {title && (
                <div className={styles.header}>
                    <h2 className={styles.title}>{title}</h2>
                </div>
            )}

            <div className={styles.carouselWrapper}>
                <button
                    className={`${styles.controlButton} ${styles.left}`}
                    onClick={(e) => { e.stopPropagation(); scroll('left'); }}
                    onMouseEnter={() => setIsHoveringArrow(true)}
                    onMouseLeave={() => setIsHoveringArrow(false)}
                    disabled={!showLeft}
                >
                    <ChevronLeft size={24} />
                </button>

                <div
                    className={`${styles.scrollContainer} ${rows === 2 ? styles.doubleRow : styles.singleRow} ${isHoveringArrow ? styles.disableInteraction : ''}`}
                    ref={containerRef}
                    onScroll={checkScroll}
                >
                    {children}
                </div>

                <button
                    className={`${styles.controlButton} ${styles.right}`}
                    onClick={(e) => { e.stopPropagation(); scroll('right'); }}
                    onMouseEnter={() => setIsHoveringArrow(true)}
                    onMouseLeave={() => setIsHoveringArrow(false)}
                    disabled={!showRight}
                >
                    <ChevronRight size={24} />
                </button>
            </div>
        </section>
    );
}

export default ScrollableSection;
