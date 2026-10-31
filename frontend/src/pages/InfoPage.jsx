import { useLocation } from "react-router-dom"
import Navbar from "./Navbar"
import './InfoPage.css'

export default function InfoPage() {
    const { pathname } = useLocation()

    const isHome = pathname === "/"
    const isAbout = pathname === "/about"
    const isTos = pathname === "/tos"

    return (
        <>
            <Navbar />

            {/* HOME */}
            <div className={isHome ? "info-section" : "info-section hidden"}>
                <img className="hero" src="/neotwewy_hero.jpg" alt="NEO TWEWY" />
                <div className="logo">
                    <img src="/tcewylogo3.png" alt="The Chat Ends With You" />
                </div>
                <div className="tagline">
                    <p className="tagline-left">The Reapers' Game has a new rule: stay connected.</p>
                    <p className="tagline-right">A TWEWY-inspired chat app where every message feels like Shibuya.</p>
                </div>
                <div className="changelog">
                    <h3 className="changelog-title">Changelog</h3>
                    <ul className="changelog-list">
                        <li><span className="changelog-day">Day 1 (v0.1)</span> — Initial Build</li>
                    </ul>
                </div>
            </div>

            {/* ABOUT */}
            <div className={isAbout ? "info-section" : "info-section hidden"}>
                <div className="spoiler-warning">
                    <img src="/opin.webp" alt="O-Pin" className="opin-icon" />
                    <p className="spoiler-text">
                        WARNING: THIS WEBSITE CONTAINS MAJOR SPOILERS FOR <strong>THE WORLD ENDS WITH YOU</strong> AND <strong>NEO: THE WORLD ENDS WITH YOU.</strong><br />
                        YOU HAVE BEEN WARNED.
                    </p>
                </div>
                <div className="about-content">
                    <div className="about-text">
                        <p>
                            <strong>The Chat Ends With You</strong> is an unofficial, non-commercial fan project inspired by the visual language and atmosphere of <strong>The World Ends With You</strong> and <strong>NEO: The World Ends With You</strong>.
                        </p>
                        <br />
                        <p>
                            Created by a single developer, <strong>ChrisCTRD</strong>, the goal is to offer a more immersive and dynamic chat experience, using the iconic art style, speech bubbles, and character portraits from the games as a form of expression in every conversation. This is a passion project made by a fan, for fans.
                        </p>
                        <br />
                        <p>
                            <strong>Spoiler Warning:</strong> This website contains major spoilers for both <strong>The World Ends With You</strong> and <strong>NEO: The World Ends With You</strong>. Proceed at your own risk.
                        </p>
                        <br />
                        <p>
                            All game assets used in this project — including character portraits, backgrounds, and visual elements — belong to <strong>Square Enix</strong>.
                        </p>
                        <br />
                        <p>
                            This project is non-commercial and does not generate revenue in any form — no ads, no paywalls, no monetization of any kind.
                        </p>
                        <br />
                        <p>
                            This project is not affiliated with, endorsed by, or connected to <strong>Square Enix</strong> in any way.
                        </p>
                        <br />
                        <p>
                            <strong>Contact:</strong> For questions, concerns, or reports outside the app, reach out at <a href="mailto:cc3402211@gmail.com" className="about-link">cc3402211@gmail.com</a>. If you are a rights holder with concerns about this project, please reach out and I will respond promptly.
                        </p>
                    </div>
                    <img src="/twewyguide.webp" alt="TWEWY Artwork" className="about-artwork" />
                </div>
            </div>

            {/* TOS */}
            <div className={isTos ? "info-section" : "info-section hidden"}>
                <div className="tos-content">
                    <h2 className="tos-title">Terms of Service</h2>
                    <p className="tos-placeholder">Coming soon.</p>
                </div>
            </div>

            <footer className="footer">
                <p>© SQUARE ENIX CO., LTD. All Rights Reserved.</p>
                <p>The Chat Ends With You is an unofficial, non-commercial fan project, not affiliated with or endorsed by Square Enix.</p>
            </footer>
        </>
    )
}
