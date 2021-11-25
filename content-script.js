(function (b) {
	const w = "▚▀▞";
	const [os, agent, browserCanHandleExternalLinks] = getOSAndBrowser();
	const notificationCenterID = '___notificationCenter___';
	const fadeTimeout = 2500;
	const updateLinksInterval = 500;
	const grabbed = `GRAB🤏`;
	const tooltip = `When you click on "${grabbed}" link,
I'll save it in the clipboard.
Use ${os === "Win" ? "⊞ Win + R" : "⌘ Cmd + K"} and paste the link there.` + (os === "Win" ? "" : `
Mac users, you can also allow FireFox to open smb links directly
Make sure to select "Finder" on the poupup that you get and click "always allow"`);
	const linksToHandlePrefix = os === "Win" ? "\\\\\\\\becks" : "openfolder";
	const getUrl = b.runtime?.getURL ?? b.extension?.getURL ?? (s => `./${s}`);

	const style = `
		#${notificationCenterID}{
			position: fixed;
			top: 0;
			right: 0;
			z-index: 9999;
			display: flex;
			flex-direction: row-reverse;
			font-family: sans-serif;
			font-weight: 400;
			background: white;
			box-shadow:
				0px 8.5px 13.2px -10px rgba(0, 0, 0, 0.13),
				0px 9.9px 14.8px -10px rgba(0, 0, 0, 0.088),
				0px 10.6px 15.5px -10px rgba(0, 0, 0, 0.079),
				0px 12px 17.8px -10px rgba(0, 0, 0, 0.071),
				0px 20px 28px -10px rgba(0, 0, 0, 0.059);

			border: 2px solid black;
			border-radius: 8px;
			border-top-right-radius: 0;
			border-bottom-right-radius: 0;
		} 
	
		#${notificationCenterID} img {
			padding: 2px 5px;
		}
	
		#${notificationCenterID} .notification{
			display:flex;
			flex-direction: column;
			box-sizing: border-box;
			max-width: 800px;
			transition: all ease-in 250ms;
			opacity: 1;
			align-items:center;
			justify-content:center;
			overflow:hidden;
			white-space: nowrap;
			border-right: 1px solid black;
		}

		#${notificationCenterID} .notification.error{
			color: red;
		}
	
		#${notificationCenterID} .notification.hidden{
			max-width:0;
			opacity: 0;
		}

		#${notificationCenterID} .notification .title, 
		#${notificationCenterID} .notification .message{
			max-width:100%;
			text-overflow: ellipsis;
			overflow: hidden;
			box-sizing: border-box;
		}

		#${notificationCenterID} .notification .title{
			font-weight: 600;
			letter-spacing: -.3px;
			padding-bottom: 8px;
		}

		#${notificationCenterID} .notification .message{
			padding: 0 5px;
		}
	
		#${notificationCenterID} textarea{
			opacity: 0;
			position: fixed;
			left: 0;
			top: 0;
		}`;

	let notificationCenter = null;
	let notification = null;
	let notificationFadeTimer = null;

	init();

	/*  Following MDN's
		Engine		Must contain						Must not contain
		Edge		Edg/xyz					
		Firefox		Firefox/xyz							Seamonkey/xyz
		Seamonkey	Seamonkey/xyz	
		Chrome		Chrome/xyz							Chromium/xyz
		Chromium	Chromium/xyz	
		Safari		Safari/xyz							Chrome/xyz or Chromium/xyz
		Opera 15+ 	(Blink-based engine)				OPR/xyz	
		Opera 12- 	(Presto-based engine)				Opera/xyz	
		Internet 	; MSIE xyz;														<== Too old for support here anyway
		Internet 	Explorer 11	Trident/7.0; .*rv:xyz								<== Too old for support here anyway
	*/
	function getOSAndBrowser() {
		const userAgent = window?.navigator?.userAgent;
		const os = (/\((.+?);.*\)/.exec(userAgent)?.[1]?.toLocaleLowerCase().includes("macintosh") ?? false) ? "Mac" : "Win";
		const agents = new Set([...window.navigator.userAgent.matchAll(/(\w+)\/[0-9.]+/ig)].reduce((acc, ua) => {
			ua.length > 1 && acc.push(ua[1]);
			return acc;
		}, []));
		let agent;
		let browserCanHandleExternalLinks = false;

		if (agents.has("Edg")) {
			agent = "Edge";
			browserCanHandleExternalLinks = true;
		}
		else if (agents.has("Seamonkey")) {
			agent = "Seamonkey";
		}
		else if (agents.has("Firefox")) {
			agent = "Firefox";
			browserCanHandleExternalLinks = os === "Mac";
		}
		else if (agent.has("Chromium")) {
			agent = "Chromium";
		}
		else if (agent.has("Chrome")) {
			agent = "Chrome";
		}
		else if (agent.has("Safari")) {
			agent = "Safari";
		}
		else {
			agent = "Unsupported";
		}

		return [os, agent, browserCanHandleExternalLinks];
	}

	// Handles onclicks on elements that hava dataset.link
	async function onMouseDown(e) {
		let targetUrl = e.target?.dataset?.link;

		if (!targetUrl) {
			return;
		}

		try {
			// For Windows only add quotes to support spaces in the file link
			await copyToClipboard(os === "Win" ? `"${targetUrl}"` : targetUrl);

			showNotification("Link copied to clipboard!", targetUrl, "info");
		}
		catch (err) {
			showNotification("Error has occured", err?.message?.toString() ?? "No detaials are available", "error");
		}

		// If the bros
		if (browserCanHandleExternalLinks){
			return;
		}
			
		e.preventDefault();
		e.stopPropagation();
	
		return 0; // The 0 is on purpose in this case
	}

	// copy text to clipboard 
	function copyToClipboard(textToCopy) {
		// navigator clipboard api needs a secure context (https)
		if (navigator.clipboard && window.isSecureContext) {
			// navigator clipboard api method'
			return navigator.clipboard.writeText(textToCopy);
		}
		else {
			// revert to using textarea if navigator.clipboard is not supported
			const textArea = document.createElement("textarea");

			textArea.value = textToCopy;
			textArea.className = "hidden";

			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();

			return new Promise((res, rej) => {
				document.execCommand('copy') ? res() : rej();
				textArea.remove();
			});
		}
	}

	function createNotifcationCenter() {
		try {
			notificationCenter = document.getElementById(notificationCenterID);

			if (!notificationCenter) {
				// Add the style script
				const styleElement = document.createElement("style");

				styleElement.innerText = style;

				document.head.appendChild(styleElement);

				// Add the notification center element 
				notificationCenter = document.createElement("div"); // Create the main elemenet
				notificationCenter.id = notificationCenterID;
				document.body.appendChild(notificationCenter);

				// create the icon
				const img = document.createElement("img"); // create the icon

				img.src = getUrl("icons/icon.png"),
					img.title = tooltip;

				notificationCenter.appendChild(img);
			}
		}
		catch (e) {
			console.error(`${w} error in createNotifcationCenter`, e);
		}
	}

	function showNotification(title, message, type) {
		if (!notificationCenter) {
			console.error(`${w} there's no notifcation center element, cannot show notifcation 🥺`);

			return;
		}

		if (!notification) {
			notification = document.createElement("div");
			notificationCenter.appendChild(notification);
		}
		else {
			clearTimeout(notificationFadeTimer);
		}

		notification.className = `notification ${type}`;

		// clear childrens
		while (notification.firstChild) {
			notification.removeChild(notification.firstChild)
		}

		// Add the title
		let lbl = document.createElement("label");
		lbl.className = "titie";
		lbl.innerText = title;
		notification.appendChild(lbl);

		// Add the message
		lbl = document.createElement("lbl");
		lbl.className = "message";
		lbl.title = message.replace(/"/g, "");
		lbl.innerText = message;
		notification.appendChild(lbl);

		// restart the fade timer
		notificationFadeTimer = setTimeout(() => notification.classList.toggle("hidden", true), fadeTimeout);
	}

	function init() {
		console.info(`${w} Initializing...`);

		try {
			createNotifcationCenter();
		}
		catch (e) {
			console.error(`${w} Coudld not create notifcation center elements`, e);
		}

		// Handle mouse down on the document (click is too late)
		window.addEventListener("mousedown", onMouseDown);

		// Update the anchors that the BM Creates
		setInterval(() => document.querySelectorAll(`td a+a[href^=${linksToHandlePrefix}]`).forEach(link => {
			let newRef;

			if (os === "Win") {
				// don't change it
				if (link.href.startsWith("file://")) {
					newRef = link.href;
				}
				else {
					newRef = `file://${link.href.replace("\\", "/").replace(/http:\/\//i, "")}`;
				}
			}
			else {
				newRef = link.href.replace("openfolder", "smb").replace("/bs_mixed/", "/");
			}

			// Edge and Firefox for Mac can handle the file:// links directly so keep the link.target
			if (!browserCanHandleExternalLinks) {
				link.target = "_blank";
			}

			link.href = newRef;
			link.innerText = grabbed;
			link.dataset.link = newRef;
		}), updateLinksInterval);

		console.info(`${w} Ready ${os}/${agent} handles file links? ${browserCanHandleExternalLinks}`);
	}
})(typeof browser !== "undefined" ? browser : chrome);