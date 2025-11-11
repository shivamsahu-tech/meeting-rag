'use client';

import { Store, User, Info, X } from 'lucide-react';
import { useState } from 'react';

interface Agent {
  id: number;
  name: string;
  description: string;
  tags: string;
  prompt: string;
}

export default function AgentStorePage() {
  const [activeTab, setActiveTab] = useState<string>('pre-defined');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const agents: Agent[] = [
    {
      id: 1,
      name: 'Competitor Analysis Agent',
      description: 'An expert market researcher and competitor analysis specialist. Your primary objective is to identify and evaluate the main competitors of any product, company, or startup under discussion, and to highlight the key unique differentiators that set the target apart.',
      tags: 'Business, Pitching',
      prompt: `You are CompetitorAnalysisAgent, an expert market researcher and competitor analysis specialist. Your primary objective is to identify and evaluate the main competitors of any product, company, or startup under discussion, and to highlight the key unique differentiators that set the target apart.

Role and Expertise:
• Domain expertise in market research, industry benchmarking, and competitive intelligence
• Deep familiarity with product positioning, pricing strategies, feature comparisons, and go-to-market tactics

Tone and Communication Style:
• Professional, concise, and neutral
• Clear, jargon-free explanations, with technical details when relevant
• Evidence-based, citing publicly available sources or industry reports`
    },
    {
      id: 2,
      name: 'What to say next?',
      description: 'A conversational AI assistant that analyzes the current meeting context and suggests appropriate responses or talking points to help users navigate discussions smoothly.',
      tags: 'Communication, Meeting',
      prompt: 'You are a meeting assistant that helps users know what to say next based on the conversation context. Analyze the discussion and provide concise, relevant suggestions.'
    },
    {
      id: 3,
      name: 'GTM Advisor',
      description: 'Go-to-market strategy expert that provides actionable advice on product launches, market positioning, customer acquisition, and growth strategies.',
      tags: 'Business, Strategy',
      prompt: 'You are a GTM (Go-to-Market) advisor with expertise in product launches, market analysis, and growth strategies. Provide practical, data-driven recommendations for market entry and expansion.'
    },
    {
      id: 4,
      name: 'Counterpoint Agent',
      description: 'Critique the point raised and generate a counter point to strengthen arguments. Helps in preparing for objections and building robust discussion points.',
      tags: 'Debate, Critical Thinking',
      prompt: 'You are a critical thinking expert. When a point is raised, analyze it thoroughly and generate thoughtful counterarguments. Help users see different perspectives and prepare for objections.'
    },
    {
      id: 5,
      name: 'Meeting Summarizer',
      description: 'Summarize the meeting till now with key points, decisions made, action items, and important discussions in a concise format.',
      tags: 'Productivity, Documentation',
      prompt: 'You are a meeting summarizer. Create clear, concise summaries of meeting discussions including key points, decisions, action items, and next steps.'
    },
    {
      id: 6,
      name: 'Cue Card Agent',
      description: 'A specialized agent designed to help users prepare for meetings by creating quick-reference cue cards with key talking points, data, and responses.',
      tags: 'Preparation, Meeting',
      prompt: 'You are a cue card creator. Help users prepare for meetings by generating concise, easy-to-reference talking points, key data, and suggested responses.'
    },
    {
      id: 7,
      name: 'AI Answer',
      description: 'An intelligent Q&A assistant that provides accurate, real-time answers to user queries across domains such as science, tech, business, and more using retrieval-based augmentation.',
      tags: 'Q&A, Research',
      prompt: 'You are an intelligent Q&A assistant. Provide accurate, well-researched answers to questions across various domains. Use retrieval-based methods when available and cite sources.'
    },
  ];

  return (
    <div className="flex-1 bg-gray-50 p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Agent Store
        </h1>
        <p className="text-gray-600">
          Discover pre-defined agents or create custom ones for your needs
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('pre-defined')}
              className={`pb-3 px-1 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'pre-defined'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Store className="w-4 h-4" />
              Pre-defined agents
            </button>
            <button
              onClick={() => setActiveTab('my-agents')}
              className={`pb-3 px-1 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'my-agents'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <User className="w-4 h-4" />
              My agents
            </button>
          </div>
        </div>
      </div>

      {/* Pre-defined agents Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        {/* Section Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Pre-defined agents
            </h2>
            <Info className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Ready-to-use, situation-specific, 1-click agents for common meeting tasks.
          </p>
        </div>

        {/* Agents List */}
        <div className="divide-y divide-gray-200">
          {agents.map((agent) => (
            <div
              key={agent.id}
              onClick={() => setSelectedAgent(agent)}
              className="px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between cursor-pointer"
            >
              {/* Left Section: Icon and Info */}
              <div className="flex items-center gap-4 flex-1">
                {/* Agent Icon */}
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Store className="w-5 h-5 text-blue-600" />
                </div>

                {/* Agent Name */}
                <div className="flex-1 min-w-0 max-w-[280px]">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {agent.name}
                  </h3>
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0 max-w-[450px]">
                  <p className="text-sm text-gray-500 truncate">
                    {agent.description}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex-shrink-0 min-w-[150px]">
                  <p className="text-sm text-gray-500">
                    {agent.tags}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Details Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Agent Details</h2>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Agent Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </label>
                <div className="text-base text-gray-900">
                  {selectedAgent.name}
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <div className="text-sm text-gray-600 leading-relaxed">
                  {selectedAgent.description}
                </div>
              </div>

              {/* Tag */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tag
                </label>
                <div className="text-sm text-gray-600">
                  {selectedAgent.tags}
                </div>
              </div>

              {/* Agent Prompt */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Prompt
                </label>
                <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap leading-relaxed border border-gray-200">
                  {selectedAgent.prompt}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedAgent(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}