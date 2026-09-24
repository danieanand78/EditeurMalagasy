"use client";

import { useEffect, useRef, useState } from "react";

const CACHE: Record<string, string> = {};

export default function TextEditor() {
    const editorRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const [tooltipData, setTooltipData] = useState({ visible: false, word: "", lemma: "", x: 0, y: 0 });
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [suggestions, setSuggestions] = useState<string[]>([]);
    const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const suggestionsRef = useRef<string[]>([]);
    const [ghostText, setGhostText] = useState("");
    const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        suggestionsRef.current = suggestions;
    }, [suggestions]);

    // Basic word wrapping on blur to not disrupt typing
    useEffect(() => {
        const formatEditor = () => {
            if (!editorRef.current) return;
            const text = editorRef.current.innerText.trim();
            if (!text) {
                editorRef.current.innerHTML = "";
                return;
            }

            const words = text.split(/(\s+|[-',.!?]+)/g);
            const html = words.map(w => {
                if (/^[a-zA-Zàâäéèêëïîôöùûüÿœæñ'\-]+$/i.test(w) && w.length > 2) {
                    return `<span class="word-span">${w}</span>`;
                }
                return w;
            }).join('');

            if (editorRef.current.innerHTML !== html) {
                editorRef.current.innerHTML = html;
                // Restoring cursor to end
                const range = document.createRange();
                range.selectNodeContents(editorRef.current);
                range.collapse(false);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
        };

        const handleBlur = () => {
            formatEditor();
        };

        // Auto format on stop typing
        let idleTimeout: NodeJS.Timeout;
        const handleKeyUp = () => {
            clearTimeout(idleTimeout);
            idleTimeout = setTimeout(() => {
                const sel = window.getSelection();
                const node = sel?.focusNode;

                const isTextEnd = node?.nodeType === Node.TEXT_NODE && sel?.focusOffset === (node as Text).length;
                const isElementEnd = node?.nodeType === Node.ELEMENT_NODE && sel?.focusOffset === node.childNodes.length;

                if (isTextEnd || isElementEnd) {
                    formatEditor();
                }
            }, 1500);
        };

        // Disable rich text paste
        const handlePaste = (e: ClipboardEvent) => {
            e.preventDefault();
            const text = e.clipboardData?.getData("text/plain");
            document.execCommand("insertText", false, text);
        };

        const handleInput = () => {
            if (suggestionTimeoutRef.current) clearTimeout(suggestionTimeoutRef.current);
            suggestionTimeoutRef.current = setTimeout(async () => {
                if (!editorRef.current) return;
                const sel = window.getSelection();
                if (!sel || sel.rangeCount === 0) {
                    setGhostText("");
                    return;
                }

                const text = editorRef.current.innerText;

                try {
                    const res = await fetch("/api/suggest", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text })
                    });
                    const data = await res.json();
                    const topSug = data.suggestions?.[0] || "";
                    setSuggestions(data.suggestions || []);

                    if (topSug && !text.endsWith(" ")) {
                        // Position ghost text relative to cursor
                        const range = sel.getRangeAt(0).cloneRange();
                        const rects = range.getClientRects();
                        if (rects.length > 0) {
                            const rect = rects[0];
                            setGhostPos({ x: rect.right, y: rect.top });
                            setGhostText(topSug);
                        } else {
                            setGhostText("");
                        }
                    } else if (topSug && text.endsWith(" ")) {
                        // After space, just show ghost at end of range
                        const range = sel.getRangeAt(0).cloneRange();
                        const rects = range.getClientRects();
                        if (rects.length > 0) {
                            const rect = rects[0];
                            setGhostPos({ x: rect.right, y: rect.top });
                            setGhostText(topSug);
                        } else {
                            setGhostText("");
                        }
                    } else {
                        setGhostText("");
                    }
                } catch (e) {
                    console.error("Suggestion error", e);
                    setGhostText("");
                }
            }, 300);
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Tab") {
                const currentSuggestions = suggestionsRef.current;
                if (currentSuggestions.length > 0 && editorRef.current) {
                    e.preventDefault();
                    const currentText = editorRef.current.innerText;
                    const space = currentText.endsWith(" ") ? "" : " ";
                    document.execCommand("insertText", false, space + currentSuggestions[0] + " ");
                    setSuggestions([]);
                    setGhostText("");
                }
            }
        };

        const el = editorRef.current;
        el?.addEventListener("blur", handleBlur);
        el?.addEventListener("keyup", handleKeyUp);
        el?.addEventListener("paste", handlePaste);
        el?.addEventListener("input", handleInput);
        el?.addEventListener("keydown", handleKeyDown);

        return () => {
            el?.removeEventListener("blur", handleBlur);
            el?.removeEventListener("keyup", handleKeyUp);
            el?.removeEventListener("paste", handlePaste);
            el?.removeEventListener("input", handleInput);
            el?.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    // Tooltip Logic
    useEffect(() => {
        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains("word-span")) {
                const word = target.innerText.trim();
                const rect = target.getBoundingClientRect();

                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

                hoverTimeoutRef.current = setTimeout(() => {
                    showTooltip(word, rect, target);
                }, 300);
            }
        };

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains("word-span")) {
                if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                setTooltipData(prev => ({ ...prev, visible: false }));
            }
        };

        const el = editorRef.current;
        el?.addEventListener("mouseover", handleMouseOver);
        el?.addEventListener("mouseout", handleMouseOut);

        return () => {
            el?.removeEventListener("mouseover", handleMouseOver);
            el?.removeEventListener("mouseout", handleMouseOut);
        };
    }, []);

    const handleSuggestionClick = (word: string) => {
        if (!editorRef.current) return;
        editorRef.current.focus();

        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);

        const currentText = editorRef.current.innerText;
        const space = currentText.endsWith(" ") ? "" : " ";
        document.execCommand("insertText", false, space + word + " ");
        setSuggestions([]);
        setGhostText("");
    };

    const showTooltip = async (word: string, rect: DOMRect, target: HTMLElement) => {
        const cleanWord = word.toLowerCase();

        // Default pos
        setTooltipData({
            visible: true,
            word: word,
            lemma: "Analyse...",
            x: rect.left + rect.width / 2,
            y: rect.top
        });

        if (CACHE[cleanWord]) {
            const cachedData = JSON.parse(CACHE[cleanWord]);
            setTooltipData(prev => ({ ...prev, lemma: cachedData.formatted }));
            if (!cachedData.is_valid) {
                target.classList.add("invalid");
            } else {
                target.classList.remove("invalid");
            }
            return;
        }

        try {
            const res = await fetch("http://localhost:8000/lemmatize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ word: word }) // send original casing for better rules
            });

            if (!res.ok) throw new Error("Backend Error");
            const data = await res.json();

            if (!data.is_valid) {
                target.classList.add("invalid");
                const errors = data.errors.join(", ") || "Inconnu";
                const formatted = `[Erreur: ${errors}]`;
                CACHE[cleanWord] = JSON.stringify({ formatted, is_valid: false });
                setTooltipData(prev => ({ ...prev, lemma: formatted }));
            } else {
                target.classList.remove("invalid");
                const formatted = data.formatted || data.lemmatized_string;
                CACHE[cleanWord] = JSON.stringify({ formatted, is_valid: true });
                setTooltipData(prev => ({ ...prev, lemma: formatted }));
            }
        } catch (err) {
            console.error(err);
            setTooltipData(prev => ({ ...prev, lemma: "[Erreur API]" }));
        }
    };

    return (
        <div className="text-editor-container">
            <header style={{ textAlign: "center" }}>
                <h1 className="title-header">Malagasy Studio</h1>
                <p className="subtitle">L'éditeur intelligent. Survolez les mots pour voir leur racine et leurs morphèmes grâce à l'API.</p>
            </header>

            <div
                ref={editorRef}
                className="editor-box"
                contentEditable
                suppressContentEditableWarning
            ></div>
            {suggestions.length > 0 && (
                <div style={{ marginTop: "1rem", display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap", width: "100%", maxWidth: "800px" }}>
                    <span style={{ fontSize: "0.8rem", color: "#888", alignSelf: "center", marginRight: "10px" }}>SUGGESTIONS :</span>
                    {suggestions.map((sug, i) => (
                        <button
                            key={i}
                            onClick={() => handleSuggestionClick(sug)}
                            style={{ padding: "5px 15px", borderRadius: "15px", border: "1px solid var(--border-color)", background: "var(--panel-bg)", cursor: "pointer", color: "var(--foreground)" }}
                        >
                            {sug}
                        </button>
                    ))}
                    <span style={{ fontSize: "0.8rem", color: "#6a7a9a", alignSelf: "center", marginLeft: "10px" }}>(ou TAB)</span>
                </div>
            )}

            {ghostText && (
                <div
                    style={{
                        position: "fixed",
                        left: ghostPos.x,
                        top: ghostPos.y,
                        color: "rgba(0, 200, 0, 0.4)",
                        pointerEvents: "none",
                        whiteSpace: "pre",
                        fontSize: "1.1rem",
                        lineHeight: "1.8",
                        fontFamily: "inherit",
                    }}
                >
                    {ghostText}
                </div>
            )}

            <div
                ref={tooltipRef}
                className="tt-container"
                style={{
                    left: tooltipData.x,
                    top: tooltipData.y,
                    opacity: tooltipData.visible ? 1 : 0
                }}
            >
                <span className="tt-word">{tooltipData.word}</span>
                <span className="tt-lemma">{tooltipData.lemma}</span>
                <div className="tt-tail"></div>
            </div>
        </div>
    );
}
