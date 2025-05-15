import React, { useState } from 'react';

const InfoTooltip = ({ text }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  
  const tooltipStyle = {
    position: 'relative', 
    display: 'inline-block',
    marginLeft: '8px', 
    cursor: 'help'
  };

  const dotStyle = {
    width: '16px',
    height: '16px',
    backgroundColor: '#4a90e2', 
    borderRadius: '50%', 
    display: 'inline-flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    color: 'white', 
    fontSize: '12px',
    fontWeight: 'bold',
    userSelect: 'none' 
  };

  const tooltipTextStyle = {
    visibility: showTooltip ? 'visible' : 'hidden', 
    width: '200px', 
    backgroundColor: '#555', 
    color: '#fff', 
    textAlign: 'center',
    borderRadius: '6px', 
    padding: '8px', 
    position: 'absolute', 
    zIndex: '1', 
    bottom: '125%', 
    left: '50%', 
    marginLeft: '-100px', 
    opacity: showTooltip ? '1' : '0', 
    transition: 'opacity 0.3s', 
    fontSize: '14px',
    fontWeight: 'normal',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)' 
  };

  
  const arrowStyle = {
    content: '""', 
    position: 'absolute',
    top: '100%', 
    left: '50%', 
    marginLeft: '-5px', 
    borderWidth: '5px',
    borderStyle: 'solid',
    borderColor: '#555 transparent transparent transparent' 
  };

  return (
    <span
      style={tooltipStyle}
      onMouseEnter={() => setShowTooltip(true)} 
      onMouseLeave={() => setShowTooltip(false)} 
      aria-label="Información adicional" 
    >
      <span style={dotStyle}>i</span>
      
      <span style={tooltipTextStyle} role="tooltip"> 
        {text}
        <span style={arrowStyle}></span>
      </span>
    </span>
  );
};

export default InfoTooltip;
