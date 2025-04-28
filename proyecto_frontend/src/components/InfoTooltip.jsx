// InfoTooltip.js
import React, { useState } from 'react';

const InfoTooltip = ({ text }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  // Estilos en línea para el componente
  const tooltipStyle = {
    position: 'relative', // Needed for absolute positioning of the tooltip text
    display: 'inline-block',
    marginLeft: '8px', // Space between title and icon
    cursor: 'help'
  };

  const dotStyle = {
    width: '16px',
    height: '16px',
    backgroundColor: '#4a90e2', // Blue background
    borderRadius: '50%', // Make it round
    display: 'inline-flex', // Use flexbox for centering
    alignItems: 'center', // Center vertically
    justifyContent: 'center', // Center horizontally
    color: 'white', // White 'i'
    fontSize: '12px',
    fontWeight: 'bold',
    userSelect: 'none' // Prevent text selection
  };

  const tooltipTextStyle = {
    visibility: showTooltip ? 'visible' : 'hidden', // Control visibility
    width: '200px', // Tooltip width
    backgroundColor: '#555', // Dark background
    color: '#fff', // White text
    textAlign: 'center',
    borderRadius: '6px', // Rounded corners
    padding: '8px', // Padding inside the tooltip
    position: 'absolute', // Position relative to the span
    zIndex: '1', // Ensure it's above other elements
    bottom: '125%', // Position above the icon (100% + 25% margin)
    left: '50%', // Center horizontally
    marginLeft: '-100px', // Adjust horizontal centering (half of width)
    opacity: showTooltip ? '1' : '0', // Control fade effect
    transition: 'opacity 0.3s', // Smooth transition for opacity
    fontSize: '14px',
    fontWeight: 'normal',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)' // Subtle shadow
  };

  // Styles for the small arrow pointing down from the tooltip
  const arrowStyle = {
    content: '""', // Necessary for pseudo-elements, but here just an empty span
    position: 'absolute',
    top: '100%', // Position at the bottom of the tooltip text box
    left: '50%', // Center the arrow horizontally
    marginLeft: '-5px', // Adjust horizontal centering
    borderWidth: '5px',
    borderStyle: 'solid',
    borderColor: '#555 transparent transparent transparent' // Creates the triangle shape
  };

  return (
    <span
      style={tooltipStyle}
      onMouseEnter={() => setShowTooltip(true)} // Show on hover
      onMouseLeave={() => setShowTooltip(false)} // Hide when mouse leaves
      aria-label="Información adicional" // Accessibility
    >
      {/* The visible 'i' icon */}
      <span style={dotStyle}>i</span>
      {/* The tooltip text box (conditionally visible) */}
      <span style={tooltipTextStyle} role="tooltip"> {/* Accessibility role */}
        {text} {/* The text passed via props */}
        {/* The arrow element */}
        <span style={arrowStyle}></span>
      </span>
    </span>
  );
};

export default InfoTooltip;
