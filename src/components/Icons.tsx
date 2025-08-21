import React from 'react'

export const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    strokeWidth={1.8}
    stroke="currentColor"
    {...props}
  >
    <path d="M9 9.75A2.25 2.25 0 0 1 11.25 7.5h5.25A2.25 2.25 0 0 1 18.75 9.75v5.25A2.25 2.25 0 0 1 16.5 17.25h-5.25A2.25 2.25 0 0 1 9 15V9.75Z" />
    <path d="M6.75 9.75v7.5A2.25 2.25 0 0 0 9 19.5h7.5" />
  </svg>
)


export const ClearIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    strokeWidth={1.8}
    stroke="currentColor"
    {...props}
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </svg>
)

export const SunIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth={1.8} stroke="currentColor" {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
  </svg>
)

export const MoonIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" strokeWidth={1.8} stroke="currentColor" {...props}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
