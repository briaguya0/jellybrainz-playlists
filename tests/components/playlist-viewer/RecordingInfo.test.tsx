import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { RecordingInfo } from "@src/pages/PlaylistsPage/components/playlist-viewer/RecordingInfo";
import type { MbRecording } from "@src/lib/types";

const recording: MbRecording = {
  id: "rec-1",
  title: "Test Song",
  length: 215000, // 3:35
  "artist-credit": [
    { name: "Test Artist", artist: { name: "Test Artist" }, joinphrase: "" },
  ],
};

describe("RecordingInfo", () => {
  it("renders title as a link to MusicBrainz recording", () => {
    render(<RecordingInfo recording={recording} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://musicbrainz.org/recording/rec-1");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("renders title text", () => {
    render(<RecordingInfo recording={recording} />);
    expect(screen.getByText("Test Song")).toBeInTheDocument();
  });

  it("renders artist credits", () => {
    render(<RecordingInfo recording={recording} />);
    expect(screen.getByText(/Test Artist/)).toBeInTheDocument();
  });

  it("renders duration in display format", () => {
    render(<RecordingInfo recording={recording} />);
    // 215000ms = 3:35
    expect(screen.getByText(/3:35/)).toBeInTheDocument();
  });

  it("renders without duration when length is null", () => {
    const noLength: MbRecording = { id: "r2", title: "No Duration", "artist-credit": [] };
    render(<RecordingInfo recording={noLength} />);
    expect(screen.getByText("No Duration")).toBeInTheDocument();
  });
});
