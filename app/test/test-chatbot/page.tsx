"use client"

import { QAPage } from "@/src/qa/components/QAPage"

export default function TestChatbotPage() {
  return (
    <QAPage
      endpoint="/api/qa-test"
      variantLabel="TEST · querying embeddings_test"
      requestTimeoutMs={90000}
      showConfidence={false}
    />
  )
}
