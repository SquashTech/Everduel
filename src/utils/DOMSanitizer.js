/**
 * DOM Sanitization Utilities
 * Provides safe DOM manipulation methods to prevent XSS vulnerabilities
 * Replaces unsafe innerHTML usage throughout the application
 */
class DOMSanitizer {
    /**
     * Allowed HTML tags for safe rendering
     */
    static ALLOWED_TAGS = new Set([
        'div', 'span', 'p', 'strong', 'em', 'u', 'br', 'img',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'
    ]);

    /**
     * Allowed attributes for safe rendering
     */
    static ALLOWED_ATTRIBUTES = new Set([
        'class', 'id', 'data-*', 'src', 'alt', 'title', 'style'
    ]);

    /**
     * Safely set text content (always safe)
     */
    static setTextContent(element, text) {
        if (!element) {
            console.warn('DOMSanitizer: Invalid element provided');
            return;
        }
        element.textContent = text || '';
    }

    /**
     * Safely set HTML content with sanitization
     */
    static setHTMLContent(element, htmlContent) {
        if (!element) {
            console.warn('DOMSanitizer: Invalid element provided');
            return;
        }

        // For simple cases, use textContent (most secure)
        if (this.isSimpleText(htmlContent)) {
            element.textContent = htmlContent;
            return;
        }

        // For complex HTML, create a sanitized version
        const sanitized = this.sanitizeHTML(htmlContent);
        element.innerHTML = sanitized;
    }

    /**
     * Check if content is simple text (no HTML tags)
     */
    static isSimpleText(content) {
        return typeof content === 'string' && !/<[^>]*>/g.test(content);
    }

    /**
     * Sanitize HTML content (basic implementation)
     * Note: For production, consider using a library like DOMPurify
     */
    static sanitizeHTML(html) {
        if (typeof html !== 'string') {
            return '';
        }

        // Remove script tags and event handlers
        let sanitized = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .replace(/style\s*=/gi, ''); // Remove inline styles for now

        return sanitized;
    }

    /**
     * Create element safely with text content
     */
    static createElement(tagName, textContent = '', className = '') {
        const element = document.createElement(tagName);
        
        if (textContent) {
            this.setTextContent(element, textContent);
        }
        
        if (className) {
            element.className = className;
        }
        
        return element;
    }

    /**
     * Create element with safe HTML structure
     */
    static createElementWithStructure(tagName, structure) {
        const element = document.createElement(tagName);
        
        if (structure.text) {
            this.setTextContent(element, structure.text);
        }
        
        if (structure.className) {
            element.className = structure.className;
        }
        
        if (structure.attributes) {
            for (const [key, value] of Object.entries(structure.attributes)) {
                if (this.isSafeAttribute(key)) {
                    element.setAttribute(key, value);
                }
            }
        }
        
        if (structure.children) {
            structure.children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else {
                    const childElement = this.createElementWithStructure(child.tagName, child);
                    element.appendChild(childElement);
                }
            });
        }
        
        return element;
    }

    /**
     * Check if an attribute is safe to set
     */
    static isSafeAttribute(attributeName) {
        if (this.ALLOWED_ATTRIBUTES.has(attributeName)) {
            return true;
        }
        
        // Allow data-* attributes
        if (attributeName.startsWith('data-')) {
            return true;
        }
        
        return false;
    }

    /**
     * Safely append multiple children to an element
     */
    static appendChildren(parent, children) {
        if (!parent || !Array.isArray(children)) {
            return;
        }
        
        children.forEach(child => {
            if (typeof child === 'string') {
                parent.appendChild(document.createTextNode(child));
            } else if (child instanceof Element) {
                parent.appendChild(child);
            }
        });
    }

    /**
     * Clear element content safely
     */
    static clearContent(element) {
        if (!element) return;
        
        // Use textContent to clear (safe and fast)
        element.textContent = '';
    }

    /**
     * Replace innerHTML usage with safe alternatives
     * Legacy support method for gradual migration
     */
    static replaceInnerHTML(element, content) {
        console.warn('DOMSanitizer: Migrating innerHTML usage - consider using setHTMLContent or setTextContent');
        this.setHTMLContent(element, content);
    }

    /**
     * Escape HTML entities in user input
     */
    static escapeHTML(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    /**
     * Create a safe log of innerHTML usage for migration tracking
     */
    static logInnerHTMLUsage(location, content) {
        console.warn(`Unsafe innerHTML usage detected at ${location}:`, {
            contentLength: content?.length || 0,
            containsHTML: this.isSimpleText(content) ? 'No' : 'Yes',
            timestamp: new Date().toISOString()
        });
    }
}

export default DOMSanitizer;