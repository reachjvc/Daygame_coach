"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  REGIONS,
  HOVER_LABEL_SUPPRESS,
  getCountryRegion,
  isArctic,
  isLocked,
} from "@/src/profile/data/regions";
import { normalizeCountryId, getDisplayName, isNoiseId } from "@/src/profile/data/map-audit";
import { MAP_CONFIG, MAP_STYLES, MAP_MESSAGES } from "../config";

interface InteractiveWorldMapProps {
  selectedRegion: string | null;
  secondaryRegion?: string | null;
  selectionMode?: "primary" | "secondary";
  onRegionSelect: (regionId: string) => void;
  showInfoBox?: boolean;
  isInteractive?: boolean;
  showCountryFocus?: boolean;
}

export function InteractiveWorldMap({
  selectedRegion,
  secondaryRegion,
  selectionMode = "primary",
  onRegionSelect,
  showInfoBox = true,
  isInteractive = true,
  showCountryFocus = true,
}: InteractiveWorldMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [hoveredArctic, setHoveredArctic] = useState<boolean>(false);
  const [hoveredLocked, setHoveredLocked] = useState<boolean>(false);
  const [hoveredCountryName, setHoveredCountryName] = useState<string | null>(null);
  const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const [selectedPrimaryCountryId, setSelectedPrimaryCountryId] = useState<string | null>(null);
  const [selectedSecondaryCountryId, setSelectedSecondaryCountryId] = useState<string | null>(null);
  const [regionCountries, setRegionCountries] = useState<Record<string, string[]>>({});
  const [svgMarkup, setSvgMarkup] = useState<string>("");
  const mapRef = useRef<HTMLDivElement | null>(null);
  const onRegionSelectRef = useRef(onRegionSelect);
  const selectionModeRef = useRef(selectionMode);
  const isInteractiveRef = useRef(isInteractive);

  onRegionSelectRef.current = onRegionSelect;
  selectionModeRef.current = selectionMode;
  isInteractiveRef.current = isInteractive;

  useEffect(() => {
    let isMounted = true;
    fetch("/world-map.svg")
      .then((response) => response.text())
      .then((markup) => {
        const sanitized = markup
          .replace(/<\?xml[^>]*\?>/i, "")
          .replace(/<!DOCTYPE[^>]*>/i, "");
        if (isMounted) {
          setSvgMarkup(sanitized);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const container = mapRef.current;
    if (!container || !svgMarkup) return;
    container.innerHTML = svgMarkup;
    const svg = container.querySelector("svg");
    if (!svg) return;

    svg.setAttribute("viewBox", MAP_CONFIG.viewBox);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
    svg.style.position = "absolute";
    svg.style.inset = "0";
    svg.style.transform = "translate(1.25%, 7.5%) scale(1.21) scaleX(0.95)";
    svg.style.transformOrigin = "50% 50%";
    svg.style.background = "transparent";

    const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `
      svg { background: transparent; }
      path[id] { fill: ${MAP_STYLES.baseFill} !important; stroke: ${MAP_STYLES.baseStroke} !important; stroke-width: 1.1 !important; }
      path[data-region] { cursor: pointer; pointer-events: all; }
      path[data-state="hover"] { fill: ${MAP_STYLES.hoverFill} !important; stroke: ${MAP_STYLES.hoverStroke} !important; }
      path[data-state="active"] { fill: ${MAP_STYLES.activeFill} !important; stroke: ${MAP_STYLES.activeStroke} !important; stroke-width: 2.2 !important; }
      path[data-state="focus"] { fill: ${MAP_STYLES.focusFill} !important; stroke: ${MAP_STYLES.focusStroke} !important; stroke-width: 2.2 !important; }
      path[data-state="primary-muted"] { fill: ${MAP_STYLES.primaryMutedFill} !important; stroke: ${MAP_STYLES.primaryMutedStroke} !important; stroke-width: 1.2 !important; stroke-dasharray: 1.2 2.6; stroke-linecap: round; stroke-linejoin: round; filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.85)) drop-shadow(0 0 8px rgba(147, 197, 253, 0.6)); }
      path[data-state="secondary"] { fill: ${MAP_STYLES.secondaryFill} !important; stroke: ${MAP_STYLES.secondaryStroke} !important; stroke-width: 1.6 !important; }
      path[data-state="focus-secondary"] { fill: ${MAP_STYLES.secondaryFocusFill} !important; stroke: ${MAP_STYLES.secondaryFocusStroke} !important; stroke-width: 2.2 !important; }
      path[data-arctic] { fill: ${MAP_STYLES.arcticFill} !important; stroke: ${MAP_STYLES.arcticStroke} !important; stroke-width: 1.2 !important; stroke-dasharray: 1.2 2.6; stroke-linecap: round; stroke-linejoin: round; cursor: pointer; filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.85)) drop-shadow(0 0 8px rgba(147, 197, 253, 0.7)); }
      path[data-arctic][data-state="hover"] { fill: ${MAP_STYLES.arcticHoverFill} !important; stroke: ${MAP_STYLES.arcticHoverStroke} !important; }
      path[data-locked] { display: none !important; visibility: hidden !important; }
    `;
    svg.insertBefore(style, svg.firstChild);

    const paths = Array.from(svg.querySelectorAll("path"));
    const regionMap: Record<string, Set<string>> = {};

    paths.forEach((path) => {
      const id = path.getAttribute("id");
      if (!id) return;

      // Hide noise paths completely
      if (isNoiseId(id)) {
        path.style.display = "none";
        path.style.visibility = "hidden";
        path.style.pointerEvents = "none";
        return;
      }

      const normalizedId = normalizeCountryId(id);
      const displayName = getDisplayName(id);

      // Classify the country using ONLY explicit mappings
      if (isArctic(normalizedId)) {
        path.setAttribute("data-arctic", "true");
        path.style.pointerEvents = "all";
      } else if (isLocked(normalizedId)) {
        path.setAttribute("data-locked", "true");
        path.style.pointerEvents = "all";
      } else {
        const region = getCountryRegion(normalizedId);
        if (region) {
          path.setAttribute("data-region", region);
          regionMap[region] = regionMap[region] || new Set();
          regionMap[region].add(displayName);
          path.style.pointerEvents = "all";
        }
      }
    });

    const regionList: Record<string, string[]> = {};
    Object.entries(regionMap).forEach(([region, countries]) => {
      regionList[region] = Array.from(countries).sort((a, b) => a.localeCompare(b));
    });
    setRegionCountries(regionList);

    const handleClick = (event: Event) => {
      if (!isInteractiveRef.current) return;
      const target = event.target as SVGPathElement | null;
      if (!target || target.tagName !== "path") return;

      if (target.hasAttribute("data-arctic")) {
        setHoveredArctic(true);
        setHoveredLocked(false);
        return;
      }

      if (target.hasAttribute("data-locked")) {
        setHoveredLocked(true);
        setHoveredArctic(false);
        return;
      }

      const region = target.getAttribute("data-region");
      if (region) {
        const id = target.getAttribute("id");
        if (id) {
          if (selectionModeRef.current === "secondary") {
            setSelectedSecondaryCountryId(id);
          } else {
            setSelectedPrimaryCountryId(id);
          }
        }
        onRegionSelectRef.current(region);
      }
    };

    const handleMove = (event: Event) => {
      if (!isInteractiveRef.current) return;
      const target = event.target as SVGPathElement | null;
      if (!target || target.tagName !== "path") return;

      const id = target.getAttribute("id");
      const displayName = id ? getDisplayName(id) : null;
      const normalizedId = id ? normalizeCountryId(id) : null;

      setHoveredCountryName(displayName);
      setHoveredCountryId(normalizedId);
      setHoveredPathId(id);

      if (target.hasAttribute("data-arctic")) {
        setHoveredArctic(true);
        setHoveredLocked(false);
        setHoveredRegion(null);
        return;
      }

      if (target.hasAttribute("data-locked")) {
        setHoveredLocked(true);
        setHoveredArctic(false);
        setHoveredRegion(null);
        return;
      }

      const region = target.getAttribute("data-region");
      setHoveredArctic(false);
      setHoveredLocked(false);
      setHoveredRegion(region);
    };

    const handleLeave = () => {
      setHoveredArctic(false);
      setHoveredLocked(false);
      setHoveredRegion(null);
      setHoveredCountryName(null);
      setHoveredCountryId(null);
      setHoveredPathId(null);
    };

    svg.addEventListener("click", handleClick);
    svg.addEventListener("mouseover", handleMove);
    svg.addEventListener("mouseleave", handleLeave);

    return () => {
      svg.removeEventListener("click", handleClick);
      svg.removeEventListener("mouseover", handleMove);
      svg.removeEventListener("mouseleave", handleLeave);
      container.innerHTML = "";
    };
  }, [svgMarkup]);

  useEffect(() => {
    if (isInteractive) return;
    setHoveredArctic(false);
    setHoveredLocked(false);
    setHoveredRegion(null);
    setHoveredCountryName(null);
    setHoveredCountryId(null);
    setHoveredPathId(null);
  }, [isInteractive]);

  useEffect(() => {
    if (!selectedRegion) {
      setSelectedPrimaryCountryId(null);
    }
  }, [selectedRegion]);

  useEffect(() => {
    if (!secondaryRegion) {
      setSelectedSecondaryCountryId(null);
    }
  }, [secondaryRegion]);

  useEffect(() => {
    const svg = mapRef.current?.querySelector("svg");
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll("path"));
    paths.forEach((path) => {
      const isArcticPath = path.hasAttribute("data-arctic");
      const isLockedPath = path.hasAttribute("data-locked");

      if (isArcticPath) {
        if (hoveredArctic) {
          path.setAttribute("data-state", "hover");
        } else {
          path.removeAttribute("data-state");
        }
        return;
      }

      if (isLockedPath) {
        if (hoveredLocked) {
          path.setAttribute("data-state", "hover");
        } else {
          path.removeAttribute("data-state");
        }
        return;
      }

      const region = path.getAttribute("data-region");
      const id = path.getAttribute("id");
      const isSelected = region === selectedRegion;
      const isSecondary = region === secondaryRegion;
      const isHovered = region === hoveredRegion;
      const isHoverFocus =
        showCountryFocus &&
        Boolean(id && hoveredPathId && id === hoveredPathId) &&
        isHovered;
      const focusCountryId =
        selectionMode === "secondary" ? selectedSecondaryCountryId : selectedPrimaryCountryId;
      const focusRegion = selectionMode === "secondary" ? secondaryRegion : selectedRegion;
      const isSelectedFocus =
        showCountryFocus &&
        Boolean(id && focusCountryId && id === focusCountryId) &&
        region === focusRegion &&
        !isHoverFocus;

      if (selectionMode === "secondary") {
        if (isSelected) {
          path.setAttribute("data-state", "primary-muted");
          return;
        }

        if (isHoverFocus || isSelectedFocus) {
          path.setAttribute("data-state", "focus");
        } else if (region === focusRegion) {
          path.setAttribute("data-state", "active");
        } else if (isHovered) {
          path.setAttribute("data-state", "hover");
        } else {
          path.removeAttribute("data-state");
        }
        return;
      }

      const isSecondaryFocus =
        showCountryFocus &&
        Boolean(id && selectedSecondaryCountryId && id === selectedSecondaryCountryId) &&
        isSecondary &&
        !isHoverFocus &&
        !isSelectedFocus;
      if (isHoverFocus || isSelectedFocus) {
        path.setAttribute("data-state", "focus");
      } else if (isSecondaryFocus) {
        path.setAttribute("data-state", "focus-secondary");
      } else if (isSelected) {
        path.setAttribute("data-state", "active");
      } else if (isSecondary) {
        path.setAttribute("data-state", "secondary");
      } else if (isHovered) {
        path.setAttribute("data-state", "hover");
      } else {
        path.removeAttribute("data-state");
      }
    });
  }, [
    selectedRegion,
    secondaryRegion,
    hoveredRegion,
    hoveredArctic,
    hoveredLocked,
    hoveredPathId,
    selectedPrimaryCountryId,
    selectedSecondaryCountryId,
    selectionMode,
    showCountryFocus,
    svgMarkup,
  ]);

  // Priority ordering for major daygame cities/countries
  const COUNTRY_PRIORITY: Record<string, string[]> = {
    "north-america": ["USA", "Canada"],
    "latin-america": ["Mexico", "Brazil", "Argentina", "Colombia", "Chile", "Peru"],
    "western-europe": ["France", "Germany", "United Kingdom", "Netherlands", "Belgium", "Switzerland"],
    "slavic-europe": ["Russia", "Ukraine", "Belarus"],
    "eastern-europe": ["Poland", "Czech", "Romania", "Hungary", "Croatia", "Bulgaria", "Serbia"],
    "scandinavia": ["Sweden", "Norway", "Denmark", "Finland", "Iceland"],
    "southern-europe": ["Spain", "Italy", "Greece", "Portugal"],
    "africa": ["South Africa", "Nigeria", "Kenya", "Egypt", "Morocco", "Ghana"],
    "middle-east": ["UAE", "Turkey", "Israel", "Lebanon", "Saudi Arabia"],
    "south-asia": ["India", "Pakistan", "Bangladesh", "Sri Lanka"],
    "southeast-asia": ["Thailand", "Vietnam", "Philippines", "Indonesia", "Malaysia", "Singapore"],
    "east-asia": ["China", "Japan", "South Korea", "Taiwan"],
    "australia": ["Australia", "New Zealand"],
  };

  const getSortedCountries = (regionId: string) => {
    const countries = regionCountries[regionId] || [];
    if (!countries.length) {
      return [];
    }

    const priority = COUNTRY_PRIORITY[regionId] || [];
    return [...countries].sort((a, b) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);

      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  };

  const getCountryPreview = (regionId: string, highlightNames: Array<string | null>) => {
    const sorted = getSortedCountries(regionId);
    if (!sorted.length) {
      return {
        items: [] as string[],
        hasMore: false,
        fallback: REGIONS.find((region) => region.id === regionId)?.description,
      };
    }

    let ordered = sorted;
    const uniqueHighlights = Array.from(
      new Set(highlightNames.filter((name): name is string => Boolean(name)))
    );
    uniqueHighlights.forEach((highlightName) => {
      if (ordered.includes(highlightName)) {
        ordered = [highlightName, ...ordered.filter((name) => name !== highlightName)];
      }
    });

    return {
      items: ordered.slice(0, MAP_CONFIG.countryPreviewLimit),
      hasMore: ordered.length > MAP_CONFIG.countryPreviewLimit,
      fallback: null as string | null,
    };
  };

  const selectedLabelRegion =
    selectionMode === "secondary" ? secondaryRegion : selectedRegion;
  const activeRegion =
    hoveredRegion ||
    selectedLabelRegion ||
    selectedRegion ||
    "scandinavia";
  const activeRegionInfo = REGIONS.find((region) => region.id === activeRegion);
  const allowHoverLabel =
    Boolean(hoveredCountryName) &&
    Boolean(hoveredRegion) &&
    !HOVER_LABEL_SUPPRESS.has(hoveredCountryId || "");
  const selectedCountryId =
    selectionMode === "secondary" ? selectedSecondaryCountryId : selectedPrimaryCountryId;
  const selectedCountryName = selectedCountryId ? getDisplayName(selectedCountryId) : null;
  const selectedRegionForLabel = selectionMode === "secondary" ? secondaryRegion : selectedRegion;
  const showSelectedCountry = Boolean(selectedCountryName) && Boolean(selectedRegionForLabel);
  const showHoverCountry =
    allowHoverLabel &&
    hoveredCountryName &&
    hoveredCountryName !== selectedCountryName;
  const preview = getCountryPreview(activeRegion, [
    selectedCountryName,
    allowHoverLabel ? hoveredCountryName : null,
  ]);

  return (
    <div className="w-full">
      <div
        ref={mapRef}
        className={`relative w-full rounded-lg border border-border bg-card/80 overflow-hidden shadow-sm ${isInteractive ? "" : "pointer-events-none"}`}
        style={{ paddingBottom: "65.3%" }}
      />

      {/* Always show region info box - fixed height to prevent layout shift */}
      {showInfoBox && (
        <Card className="mt-4 min-h-[70px] items-center justify-center border-border/60 bg-muted/40 p-3">
          <div className="text-center">
            {hoveredArctic ? (
              <>
                <h3 className="mb-1 text-lg font-bold text-primary">Arctic Circle</h3>
                {hoveredCountryName && (
                  <p className="mb-2 text-sm text-muted-foreground">{hoveredCountryName}</p>
                )}
                <p className="text-sm font-semibold text-foreground">{MAP_MESSAGES.locked}</p>
              </>
            ) : hoveredLocked ? (
              <>
                <h3 className="mb-1 text-lg font-bold text-primary">Locked Territory</h3>
                {hoveredCountryName && (
                  <p className="mb-2 text-sm text-muted-foreground">{hoveredCountryName}</p>
                )}
                <p className="text-sm font-semibold text-foreground">{MAP_MESSAGES.lockedSmall}</p>
              </>
            ) : (
              <>
                <h3 className="mb-1 text-lg font-bold text-primary">
                  {activeRegionInfo?.name || "Scandinavia"}
                </h3>
                {showSelectedCountry && (
                  <p className="mb-1 text-sm text-muted-foreground">
                    Selected: <span className="font-semibold text-red-500">{selectedCountryName}</span>
                  </p>
                )}
                {showHoverCountry && (
                  <p className="mb-1 text-sm text-muted-foreground">
                    Hovering: <span className="font-semibold text-foreground">{hoveredCountryName}</span>
                  </p>
                )}
                {!showSelectedCountry && allowHoverLabel && hoveredCountryName && (
                  <p className="mb-1 text-sm text-muted-foreground">
                    Country: <span className="font-semibold text-red-500">{hoveredCountryName}</span>
                  </p>
                )}
                <p className="text-sm font-semibold text-foreground">
                  {preview.items.length ? (
                    <>
                      {preview.items.map((country, index) => (
                        <span
                          key={`${country}-${index}`}
                          className={
                            country === selectedCountryName
                              ? "text-red-500"
                              : allowHoverLabel && country === hoveredCountryName
                                ? "text-red-400"
                                : undefined
                          }
                        >
                          {country}
                          {index < preview.items.length - 1 ? ", " : ""}
                        </span>
                      ))}
                      {preview.hasMore && <span className="text-muted-foreground">, ...</span>}
                    </>
                  ) : (
                    preview.fallback || activeRegionInfo?.description
                  )}
                </p>
                <div className="h-6 flex items-center justify-center">
                  {selectedLabelRegion && selectedLabelRegion === (hoveredRegion || selectedLabelRegion) && (
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">Selected</p>
                  )}
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
