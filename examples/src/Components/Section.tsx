import React from "react";
import { ChevronIcon } from "./Icons";

interface SectionProps {
    title: string;
    hint?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
}

// Collapsible rail section: styled <details> so open state needs no JS
const Section = ({
    title,
    hint,
    defaultOpen = true,
    children,
}: SectionProps): JSX.Element => (
    <details className="section" open={defaultOpen}>
        <summary>
            <ChevronIcon />
            <span className="section-title">{title}</span>
            {hint && <span className="section-hint">{hint}</span>}
        </summary>
        <div className="section-body">{children}</div>
    </details>
);

export default Section;
