import { addIcon } from 'obsidian';

export function loadIcons() {
    // 加载自定义图标
    addIcon('align-left', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="15" y="15" width="70" height="70" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.3"/>
        <path d="M25,30 L75,30 M25,50 L60,50 M25,70 L70,70" stroke="currentColor" stroke-width="3"/>
    </svg>`);
    
    addIcon('align-center', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="15" y="15" width="70" height="70" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.3"/>
        <path d="M25,30 L75,30 M35,50 L65,50 M30,70 L70,70" stroke="currentColor" stroke-width="3"/>
    </svg>`);
    
    addIcon('align-right', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="15" y="15" width="70" height="70" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.3"/>
        <path d="M25,30 L75,30 M40,50 L75,50 M30,70 L75,70" stroke="currentColor" stroke-width="3"/>
    </svg>`);
    
    addIcon('align-top', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="15" y="15" width="70" height="70" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.3"/>
        <path d="M30,25 L30,75 M50,25 L50,60 M70,25 L70,70" stroke="currentColor" stroke-width="3"/>
    </svg>`);
    
    addIcon('align-middle', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="15" y="15" width="70" height="70" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.3"/>
        <path d="M30,25 L30,75 M50,35 L50,65 M70,30 L70,70" stroke="currentColor" stroke-width="3"/>
    </svg>`);
    
    addIcon('align-bottom', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="15" y="15" width="70" height="70" fill="none" stroke="currentColor" stroke-width="2" stroke-opacity="0.3"/>
        <path d="M30,25 L30,75 M50,40 L50,75 M70,30 L70,75" stroke="currentColor" stroke-width="3"/>
    </svg>`);
    
    addIcon('align-all', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" stroke-width="3"/>
        <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" stroke-width="3"/>
    </svg>`);
    
    addIcon('merge-cells', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="10" y="10" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3"/>
        <rect x="60" y="10" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3"/>
        <rect x="10" y="60" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3"/>
        <rect x="60" y="60" width="30" height="30" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M50,45 L50,55 M45,50 L55,50" stroke="currentColor" stroke-width="3"/>
    </svg>`);
    
    addIcon('merge-right', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="15" y="30" width="30" height="40" fill="none" stroke="currentColor" stroke-width="3"/>
        <rect x="55" y="30" width="30" height="40" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M45,50 L55,50 M50,45 L55,50 L50,55" stroke="currentColor" stroke-width="3"/>
    </svg>`);
    
    addIcon('merge-down', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="30" y="15" width="40" height="30" fill="none" stroke="currentColor" stroke-width="3"/>
        <rect x="30" y="55" width="40" height="30" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M50,45 L50,55 M45,50 L50,55 L55,50" stroke="currentColor" stroke-width="3"/>
    </svg>`);
    
    addIcon('split', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M50,20 L50,80 M20,50 L80,50" stroke="currentColor" stroke-width="3"/>
    </svg>`);
    
    addIcon('table-id', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="20" y="30" width="60" height="50" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M20,30 L80,30" stroke="currentColor" stroke-width="5"/>
        <rect x="35" y="15" width="30" height="15" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M45,45 L45,65 M55,45 L55,65 M45,55 L55,55" stroke="currentColor" stroke-width="2"/>
    </svg>`);
    
    addIcon('table-row-add', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M20,50 L80,50" stroke="currentColor" stroke-width="3"/>
        <circle cx="85" cy="50" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M85,45 L85,55 M80,50 L90,50" stroke="currentColor" stroke-width="2"/>
    </svg>`);
    
    addIcon('table-style', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="20" y="20" width="60" height="60" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M20,40 L80,40 M20,60 L80,60 M40,20 L40,80 M60,20 L60,80" stroke="currentColor" stroke-width="2"/>
        <path d="M65,25 L75,35 M65,35 L75,25" stroke="currentColor" stroke-width="2"/>
        <path d="M25,45 L35,55 M35,45 L25,55" stroke="currentColor" stroke-width="2"/>
        <circle cx="50" cy="50" r="5" fill="currentColor"/>
    </svg>`);
    
    // 添加表格工具栏切换图标
    addIcon('table-toolbar-toggle', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="15" y="15" width="70" height="70" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M15,35 L85,35 M15,65 L85,65" stroke="currentColor" stroke-width="2"/>
        <path d="M35,15 L35,85 M65,15 L65,85" stroke="currentColor" stroke-width="2"/>
        <rect x="40" y="5" width="20" height="10" fill="currentColor"/>
        <rect x="40" y="85" width="20" height="10" fill="currentColor"/>
        <rect x="5" y="40" width="10" height="20" fill="currentColor"/>
        <rect x="85" y="40" width="10" height="20" fill="currentColor"/>
    </svg>`);
    
    // 添加编辑模式表格操作图标
    addIcon('table-edit-mode', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
        <rect x="15" y="25" width="70" height="50" fill="none" stroke="currentColor" stroke-width="3"/>
        <path d="M15,45 L85,45" stroke="currentColor" stroke-width="2"/>
        <path d="M35,25 L35,75" stroke="currentColor" stroke-width="2"/>
        <path d="M55,25 L55,75" stroke="currentColor" stroke-width="2"/>
        <path d="M75,10 L90,25 L80,35 L65,20 Z" fill="none" stroke="currentColor" stroke-width="2"/>
        <path d="M65,20 L80,35" stroke="currentColor" stroke-width="2"/>
    </svg>`);
} 