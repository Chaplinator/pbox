import { useEffect, useRef, useState } from 'react'

/**
 * Hook for lazy loading images with IntersectionObserver
 * Improves initial page load by deferring non-critical image loads
 *
 * Usage:
 * const imgRef = useImageLazyLoad('https://example.com/image.jpg', fallback)
 * <img ref={imgRef.ref} src={imgRef.src} alt="..." />
 */
export function useImageLazyLoad(src, fallback = null) {
  const ref = useRef(null)
  const [imageSrc, setImageSrc] = useState(fallback || src)

  useEffect(() => {
    if (!ref.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Load the image
            setImageSrc(src)
            // Stop observing
            observer.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before image enters viewport
      }
    )

    observer.observe(ref.current)

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current)
      }
    }
  }, [src])

  return { ref, src: imageSrc }
}

/**
 * Component for lazy-loaded images
 */
export function LazyImage({ src, alt, className = '', fallback = null }) {
  const { ref, src: imageSrc } = useImageLazyLoad(src, fallback)

  return <img ref={ref} src={imageSrc} alt={alt} className={className} loading="lazy" />
}
