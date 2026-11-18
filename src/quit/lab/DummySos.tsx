"use client"

import { PrimaryButton } from "../components/kit"
import { labText } from "./text"
import { useLabState } from "./store"

/** Proves the lab store: write a value, read it back, keep it over a reload. */
export function DummySos() {
  const [value, setValue] = useLabState<string | null>("sos", "dummy", "probe", null)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold">{labText.dummyWorks}</p>
      <PrimaryButton onClick={() => setValue(labText.dummyValue)}>{labText.dummyWrite}</PrimaryButton>
      <p data-testid="lab-dummy-value">
        {labText.dummyShown} {value ?? labText.dummyEmpty}
      </p>
    </div>
  )
}
