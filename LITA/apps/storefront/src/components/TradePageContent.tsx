"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HandshakeIcon, ArtworkSelectionIcon, DetailsIcon } from "@/components/TradeIcons";
import { TradeApplicationModal } from "@/components/TradeApplicationModal";

export function TradePageContent() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState("Interior Designer");

  const handleOpenModal = (role: string = "Interior Designer") => {
    setModalRole(role);
    setModalOpen(true);
  };

  return (
    <div className="w-full bg-white text-[#1a1a1a]">
      {/* ── 1. Hero Section ── */}
      <section className="w-full border-b border-[#E5E5E5] bg-white">
        <div className="mx-auto max-w-[900px] px-6 py-20 sm:py-28 md:py-32 text-center">
          <h1
            className="font-cormorant text-5xl sm:text-6xl md:text-[68px] lg:text-[76px] font-normal text-[#1a1a1a] tracking-tight leading-[1.12]"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Trade Program
          </h1>

          <p className="mt-6 md:mt-8 text-[15px] sm:text-[16px] text-[#4a4a4a] leading-[1.7] max-w-[620px] mx-auto font-sans font-normal text-pretty">
            Artwork for your entire project, all in one place. Members of the trade have a
            dedicated art advisor to provide artwork options, coordinate custom pieces, and
            place orders with exclusive trade pricing.
          </p>

          <div className="mt-8 sm:mt-9">
            <button
              type="button"
              onClick={() => handleOpenModal("Interior Designer")}
              className="inline-flex items-center justify-center rounded-full border border-[#222222] bg-white px-9 py-3 text-[14px] sm:text-[15px] font-normal text-[#111111] hover:bg-[#111111] hover:text-white transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98]"
            >
              Join Trade Program
            </button>
          </div>

          <p className="mt-4 text-[13px] sm:text-[14px] text-[#4a4a4a]">
            Already have a trade account? Log in{" "}
            <Link href="/login" className="underline underline-offset-2 hover:text-black">
              here.
            </Link>
          </p>
        </div>
      </section>

      {/* ── 2. Editorial Showcase Grid ── */}
      <div className="w-full">
        {/* Row 1: Interior Designers (Text Left, Image Right) */}
        <section
          id="interior-designers"
          className="w-full border-b border-[#E5E5E5]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 w-full">
            {/* Left: Text */}
            <div className="flex flex-col items-center justify-center text-center p-10 sm:p-16 md:p-20 lg:p-24 xl:p-28 border-b lg:border-b-0 lg:border-r border-[#E5E5E5]">
              <div className="max-w-[420px]">
                <h2
                  className="font-cormorant text-3xl sm:text-4xl md:text-[42px] lg:text-[46px] font-normal text-[#1a1a1a] mb-5 sm:mb-6 leading-tight"
                  style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                >
                  Interior Designers
                </h2>
                <p className="text-[#4a4a4a] text-[14px] sm:text-[15px] leading-[1.7] mb-6">
                  Original artwork to complement your unique design. Your art advisor will curate options
                  based on your mood boards, floor plans, and design decks. Focus on your client and leave
                  the art logistics to us.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => handleOpenModal("Interior Designer")}
                    className="text-[13px] sm:text-[14px] text-[#1a1a1a] underline underline-offset-4 hover:opacity-60 transition-opacity cursor-pointer font-sans"
                  >
                    Learn More
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Image */}
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 md:p-16 lg:p-20 bg-white">
              <div className="w-full max-w-[560px]">
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#F5F6F4]">
                  <Image
                    src="/trade/interior-designers.jpg"
                    alt="Interior design living room featuring curated fine art on walls above fireplace"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover object-center"
                    priority
                  />
                </div>
                <span className="block mt-2.5 text-left text-[12px] sm:text-[13px] text-[#767676] font-sans">
                  Kate Roebuck
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Row 2: Real Estate Developers (Image Left, Text Right) */}
        <section
          id="real-estate-developers"
          className="w-full border-b border-[#E5E5E5]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 w-full">
            {/* Left: Image (on desktop) */}
            <div className="order-2 lg:order-1 flex flex-col items-center justify-center p-8 sm:p-12 md:p-16 lg:p-20 bg-white border-t lg:border-t-0 lg:border-r border-[#E5E5E5]">
              <div className="w-full max-w-[560px]">
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#F5F6F4]">
                  <Image
                    src="/trade/real-estate-developers.jpg"
                    alt="Real estate architectural lobby with dramatic sculptural art installation"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover object-center"
                  />
                </div>
                <span className="block mt-2.5 text-left text-[12px] sm:text-[13px] text-[#767676] font-sans">
                  Rachel Mica Weiss
                </span>
              </div>
            </div>

            {/* Right: Text (on desktop) */}
            <div className="order-1 lg:order-2 flex flex-col items-center justify-center text-center p-10 sm:p-16 md:p-20 lg:p-24 xl:p-28">
              <div className="max-w-[420px]">
                <h2
                  className="font-cormorant text-3xl sm:text-4xl md:text-[42px] lg:text-[46px] font-normal text-[#1a1a1a] mb-5 sm:mb-6 leading-tight"
                  style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                >
                  Real Estate Developers
                </h2>
                <p className="text-[#4a4a4a] text-[14px] sm:text-[15px] leading-[1.7] mb-6">
                  From public art installations to story-driven artwork, our team delivers custom art
                  programs for residential, commercial, and retail projects of any scale.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => handleOpenModal("Real Estate Developer")}
                    className="text-[13px] sm:text-[14px] text-[#1a1a1a] underline underline-offset-4 hover:opacity-60 transition-opacity cursor-pointer font-sans"
                  >
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Row 3: Architects (Text Left, Image Right) */}
        <section
          id="architects"
          className="w-full border-b border-[#E5E5E5]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 w-full">
            {/* Left: Text */}
            <div className="flex flex-col items-center justify-center text-center p-10 sm:p-16 md:p-20 lg:p-24 xl:p-28 border-b lg:border-b-0 lg:border-r border-[#E5E5E5]">
              <div className="max-w-[420px]">
                <h2
                  className="font-cormorant text-3xl sm:text-4xl md:text-[42px] lg:text-[46px] font-normal text-[#1a1a1a] mb-5 sm:mb-6 leading-tight"
                  style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
                >
                  Architects
                </h2>
                <p className="text-[#4a4a4a] text-[14px] sm:text-[15px] leading-[1.7] mb-6">
                  Architects trust us to provide the perfect artwork for each unique space, either with
                  artwork specifications and tearsheets, or directly to the client through presentations.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={() => handleOpenModal("Architect")}
                    className="text-[13px] sm:text-[14px] text-[#1a1a1a] underline underline-offset-4 hover:opacity-60 transition-opacity cursor-pointer font-sans"
                  >
                    Learn More
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Image */}
            <div className="flex flex-col items-center justify-center p-8 sm:p-12 md:p-16 lg:p-20 bg-white">
              <div className="w-full max-w-[560px]">
                <div className="relative w-full aspect-[4/3] overflow-hidden bg-[#F5F6F4]">
                  <Image
                    src="/trade/architects.jpg"
                    alt="Architectural space with sliding pocket doors opening to framed fine art gallery display"
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="object-cover object-center"
                  />
                </div>
                <span className="block mt-2.5 text-left text-[12px] sm:text-[13px] text-[#767676] font-sans">
                  Blake Aaseby
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ── 3. Our Process Section ── */}
      <section className="w-full bg-white py-20 sm:py-28 lg:py-32 px-6 sm:px-12 border-b border-[#E5E5E5]">
        <div className="max-w-[1240px] mx-auto text-center">
          <h2
            className="font-cormorant text-4xl sm:text-5xl lg:text-[56px] font-normal text-[#1a1a1a] tracking-tight mb-16 sm:mb-20 lg:mb-24"
            style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
          >
            Our Process
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 sm:gap-14 lg:gap-16">
            {/* Step 1: Meet */}
            <div className="flex flex-col items-center text-center">
              <div className="h-16 flex items-center justify-center mb-5">
                <HandshakeIcon />
              </div>
              <h3
                className="font-cormorant text-2xl sm:text-[28px] font-normal text-[#1a1a1a] mb-3 sm:mb-4"
                style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
              >
                Meet
              </h3>
              <p className="text-[14px] sm:text-[15px] text-[#4a4a4a] leading-[1.68] max-w-[310px] mx-auto font-sans font-normal">
                Your dedicated Art Advisor will learn about your project, asking all the questions needed
                to curate a comprehensive art program
              </p>
            </div>

            {/* Step 2: Artwork Selection */}
            <div className="flex flex-col items-center text-center">
              <div className="h-16 flex items-center justify-center mb-5">
                <ArtworkSelectionIcon />
              </div>
              <h3
                className="font-cormorant text-2xl sm:text-[28px] font-normal text-[#1a1a1a] mb-3 sm:mb-4"
                style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
              >
                Artwork Selection
              </h3>
              <p className="text-[14px] sm:text-[15px] text-[#4a4a4a] leading-[1.68] max-w-[310px] mx-auto font-sans font-normal">
                You receive exclusive trade pricing and a detailed portfolio of artwork options for your
                client&apos;s review
              </p>
            </div>

            {/* Step 3: Details */}
            <div className="flex flex-col items-center text-center">
              <div className="h-16 flex items-center justify-center mb-5">
                <DetailsIcon />
              </div>
              <h3
                className="font-cormorant text-2xl sm:text-[28px] font-normal text-[#1a1a1a] mb-3 sm:mb-4"
                style={{ fontFamily: "'Cormorant Garamond', 'Garamond', Georgia, serif" }}
              >
                Details
              </h3>
              <p className="text-[14px] sm:text-[15px] text-[#4a4a4a] leading-[1.68] max-w-[310px] mx-auto font-sans font-normal">
                In addition, your advisors will coordinate framing, delivery and installation to meet
                your timeline
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trade Application Modal */}
      <TradeApplicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialRole={modalRole}
      />
    </div>
  );
}
