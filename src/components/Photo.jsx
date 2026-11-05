import { useState } from 'react'
import { mediaUrl } from '../api'

function ImageWithFallback({ sources, placeholder, alt, ...props }) {
  const [index, setIndex] = useState(0)
  return index < sources.length
    ? <img {...props} src={sources[index]} alt={alt} loading="lazy" onError={() => setIndex(value => value + 1)}/>
    : placeholder
}

export default function Photo({ src, fallback, ...props }) {
  const sources = [...new Set([src, fallback].map(mediaUrl).filter(Boolean))]
  return <ImageWithFallback key={sources.join('|')} sources={sources} {...props}/>
}
