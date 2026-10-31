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
                    <p className="tos-updated">Last updated: October 31, 2026</p>
                    <p className="tos-text">
                        TCEWY is a chat app made by a fan, for fans. These rules keep it a place people enjoy. By creating an account or using TCEWY, you agree to them.
                    </p>

                    <h3 className="tos-heading">Who can use TCEWY</h3>
                    <p className="tos-text">
                        You must be at least 13 years old. If you are under 18, you should have the permission of a parent or guardian. Accounts that appear to belong to someone under the minimum age may be removed.
                    </p>

                    <div className="tos-dodont">
                        <div className="tos-do">
                            <h3 className="tos-heading">Do</h3>
                            <ul>
                                <li>Treat other players with respect, even when you disagree.</li>
                                <li>Keep your password private and your account secure.</li>
                                <li>Close the DM or remove anyone who makes you uncomfortable, and email me to report them.</li>
                                <li>Respect it when someone closes a DM or removes you as a friend.</li>
                                <li>Tell me about bugs and security problems instead of abusing them.</li>
                            </ul>
                        </div>
                        <div className="tos-dont">
                            <h3 className="tos-heading">Don't</h3>
                            <ul>
                                <li>Harass, bully, threaten, or stalk anyone.</li>
                                <li>Post hate speech or discriminate against people.</li>
                                <li>Share sexual or explicit content. Anything that sexualizes minors will be reported to the authorities.</li>
                                <li>Share other people's private information or pretend to be someone else.</li>
                                <li>Encourage self-harm or share graphic violence.</li>
                                <li>Spam, scam, advertise, or send automated messages with bots.</li>
                                <li>Share illegal content, malware, or links meant to harm others.</li>
                                <li>Hack, overload, or scrape the service, or make new accounts to get around a ban.</li>
                            </ul>
                        </div>
                    </div>

                    <h3 className="tos-heading">Your account</h3>
                    <p className="tos-text">
                        You are responsible for everything that happens under your account, so don't share it with anyone. Your Player ID is your public handle, like @username, and it is always lowercase. You can ask me to delete your account at any time by email.
                    </p>

                    <h3 className="tos-heading">Your messages and your data</h3>
                    <p className="tos-text">
                        Messages are stored on the server so your chat history works. TCEWY keeps only what it needs to run: your email, Player ID, display name, chosen character, friend connections, and messages. I do not sell your data, and TCEWY has no ads. Don't send passwords or financial details in chats. You can ask for access to, correction of, or deletion of your data by email.
                    </p>

                    <h3 className="tos-heading">Moderation</h3>
                    <p className="tos-text">
                        I may remove messages and suspend or delete accounts that break these rules, with or without warning, especially for serious violations. Reports and appeals are handled by email, using the contact at the bottom of this page. If you think a mistake was made, email me.
                    </p>

                    <h3 className="tos-heading">Fan project</h3>
                    <p className="tos-text">
                        TCEWY is an unofficial, non-commercial fan project and is not affiliated with Square Enix. Game assets belong to Square Enix, and if a rights holder asks for something to be removed, it will be.
                    </p>

                    <h3 className="tos-heading">No guarantees</h3>
                    <p className="tos-text">
                        TCEWY is made by one person in their free time and is provided as is. It can have bugs, go down, change, or be discontinued. To the extent the law allows, I am not responsible for losses from using it or for what other users say or do.
                    </p>

                    <h3 className="tos-heading">Changes and contact</h3>
                    <p className="tos-text">
                        I may update these terms. Important changes will be announced in the changelog on the Home page, and continuing to use TCEWY means you accept them. These terms are governed by the laws of Brazil. Questions or reports: <a href="mailto:cc3402211@gmail.com" className="about-link">cc3402211@gmail.com</a>.
                    </p>
                </div>
            </div>

            <footer className="footer">
                <p>© SQUARE ENIX CO., LTD. All Rights Reserved.</p>
                <p>The Chat Ends With You is an unofficial, non-commercial fan project, not affiliated with or endorsed by Square Enix.</p>
            </footer>
        </>
    )
}
