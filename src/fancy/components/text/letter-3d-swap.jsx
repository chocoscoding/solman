"use client";
import React, { useCallback, useMemo, useState } from "react";
import { useAnimate } from "motion/react";

import { cn } from "@/lib/utils"

// handy function to split text into characters with support for unicode and emojis
const splitIntoCharacters = text => {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" })
    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }
  // Fallback for browsers that don't support Intl.Segmenter
  return Array.from(text);
}

// handy function  to extract text from children
const extractTextFromChildren = children => {
  if (typeof children === "string") return children

  if (React.isValidElement(children)) {
    const childText = children.props.children
    if (typeof childText === "string") return childText
    if (React.isValidElement(childText)) {
      return extractTextFromChildren(childText);
    }
  }

  throw new Error(
    "Letter3DSwap: Children must be a string or a React element containing a string. " +
      "Complex nested structures are not supported."
  )
}

const Letter3DSwap = ({
  children,
  as = "p",
  mainClassName,
  frontFaceClassName,
  secondFaceClassName,
  staggerDuration = 0.05,
  staggerFrom = "first",
  transition = { type: "spring", damping: 30, stiffness: 300 },
  rotateDirection = "right",
  ...props
}) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [scope, animate] = useAnimate()

  // Determine rotation transform based on direction
  const rotationTransform = (() => {
    switch (rotateDirection) {
      case "top":
        return "rotateX(90deg)"
      case "right":
        return "rotateY(90deg)"
      case "bottom":
        return "rotateX(-90deg)"
      case "left":
        return "rotateY(90deg)"
      default:
        return "rotateY(-90deg)"
    }
  })()

  // Convert children to string for processing with error handling
  const text = useMemo(() => {
    try {
      return extractTextFromChildren(children);
    } catch (error) {
      console.error(error)
      return ""
    }
  }, [children])

  // Splitting the text into animation segments
  const characters = useMemo(() => {
    const t = text.split(" ")
    const result = t.map((word, i) => ({
      characters: splitIntoCharacters(word),
      needsSpace: i !== t.length - 1,
    }))
    return result
  }, [text])

  // Helper function to calculate stagger delay for each text segment
  const getStaggerDelay = useCallback((index, totalChars) => {
    const total = totalChars
    if (staggerFrom === "first") return index * staggerDuration
    if (staggerFrom === "last") return (total - 1 - index) * staggerDuration
    if (staggerFrom === "center") {
      const center = Math.floor(total / 2)
      return Math.abs(center - index) * staggerDuration;
    }
    if (staggerFrom === "random") {
      const randomIndex = Math.floor(Math.random() * total)
      return Math.abs(randomIndex - index) * staggerDuration;
    }
    return Math.abs(staggerFrom - index) * staggerDuration;
  }, [staggerFrom, staggerDuration])

  // Handle hover start - trigger the rotation
  const handleHoverStart = useCallback(async () => {
    if (isAnimating || isHovering) return

    setIsHovering(true)
    setIsAnimating(true)

    const totalChars = characters.reduce((sum, word) => sum + word.characters.length, 0)

    // Create delays array based on staggerFrom
    const delays = Array.from({ length: totalChars }, (_, i) => {
      return getStaggerDelay(i, totalChars);
    })

    // Animate each character with its specific delay
    await animate(".letter-3d-swap-char-box-item", { transform: rotationTransform }, {
      ...transition,
      delay: (i) => delays[i],
    })

    // Reset all boxes
    await animate(
      ".letter-3d-swap-char-box-item",
      { transform: "rotateX(0deg) rotateY(0deg)" },
      { duration: 0 }
    )

    setIsAnimating(false)
  }, [
    isAnimating,
    isHovering,
    characters,
    transition,
    getStaggerDelay,
    rotationTransform,
    animate,
  ])

  // Handle hover end
  const handleHoverEnd = useCallback(() => {
    setIsHovering(false)
  }, [])

  const ElementTag = as ?? "p"

  return (
    (<ElementTag
      className={cn("flex flex-wrap relative", mainClassName)}
      onMouseEnter={handleHoverStart}
      onMouseLeave={handleHoverEnd}
      ref={scope}
      {...props}>
      <span className="sr-only">{text}</span>
      {characters.map((wordObj, wordIndex, array) => {
        const previousCharsCount = array
          .slice(0, wordIndex)
          .reduce((sum, word) => sum + word.characters.length, 0)

        return (
          (<span key={wordIndex} className="inline-flex">
            {wordObj.characters.map((char, charIndex) => {
              const totalIndex = previousCharsCount + charIndex

              return (
                (<CharBox
                  key={totalIndex}
                  char={char}
                  frontFaceClassName={frontFaceClassName}
                  secondFaceClassName={secondFaceClassName}
                  rotateDirection={rotateDirection} />)
              );
            })}
            {wordObj.needsSpace && <span className="whitespace-pre"> </span>}
          </span>)
        );
      })}
    </ElementTag>)
  );
}

const CharBox = ({
  char,
  frontFaceClassName,
  secondFaceClassName,
  rotateDirection
}) => {
  // Get the transform for the second face based on rotation direction
  const getSecondFaceTransform = () => {
    switch (rotateDirection) {
      case "top":
        return `rotateX(-90deg) translateZ(0.5lh)`
      case "right":
        return `rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(-50%) rotateY(-90deg) translateX(50%)`
      case "bottom":
        return `rotateX(90deg) translateZ(0.5lh)`
      case "left":
        return `rotateY(90deg) translateX(50%) rotateY(-90deg) translateX(50%) rotateY(-90deg) translateX(50%)`
      default:
        return `rotateY(90deg) translateZ(1ch)`
    }
  }

  const secondFaceTransform = getSecondFaceTransform()

  return (
    (<span
      className="letter-3d-swap-char-box-item inline-box transform-3d"
      style={{
        transform:
          rotateDirection === "top" || rotateDirection === "bottom"
            ? "translateZ(-0.5lh)"
            : "rotateY(90deg) translateX(50%) rotateY(-90deg)",
      }}>
      {/* Front face */}
      <div
        className={cn("relative backface-hidden h-[1lh]", frontFaceClassName)}
        style={{
          transform: `${
            rotateDirection === "top" || rotateDirection === "bottom"
              ? "translateZ(0.5lh)"
              : rotateDirection === "left"
                ? "rotateY(90deg) translateX(50%) rotateY(-90deg)"
                : "rotateY(-90deg) translateX(50%) rotateY(90deg)"
          }`,
        }}>
        {char}
      </div>
      {/* Second face - positioned based on rotation direction */}
      <span
        className={cn("absolute backface-hidden h-[1lh] top-0 left-0", secondFaceClassName)}
        style={{
          transform: secondFaceTransform,
        }}>
        {char}
      </span>
    </span>)
  );
}

Letter3DSwap.displayName = "Letter3DSwap"

export default Letter3DSwap
