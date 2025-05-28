export const fadeInUpSpring = {
  initial: { opacity: 0, y: 60 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 },
  transition: { duration: 1, type: "spring", bounce: 0.2 },
};

export const tiltHoverSpringButton = {
  whileHover: {
    rotateZ: -1.5,
    scale: 1.04,
    transition: { type: "spring", stiffness: 200, damping: 6 },
  },
  whileTap: {
    scale: 0.96,
    transition: { type: "spring", stiffness: 200, damping: 6 },
  },
};
export const tiltHoverRightSpringButton = {
  whileHover: {
    rotateZ: 1.5,
    scale: 1.04,
    transition: { type: "spring", stiffness: 200, damping: 6 },
  },
  whileTap: {
    scale: 0.96,
    transition: { type: "spring", stiffness: 200, damping: 6 },
  },
};
