(function () {
	const notificationCenterID = '___notificationCenter___';
	const fadeTimeout = 2500;
	const pwnLinksInterval = 500;
	const grabbed=`GRAB🤏`;
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

	// Handles onclicks on elements that hava dataset.link
	async function onMouseDown(e) {
		let targetUrl = e.target?.dataset?.link;

		if (!targetUrl) {
			return;
		}

		try{
			await copyToClipboard(`"${targetUrl}"`); // Add quotes to support spaces if any
		
			showNotification("Link copied to clipboard!", targetUrl, "info");
		}
		catch(err){
			showNotification("Error has occured", err?.message?.toString() ?? "No detaials are available", "error");
		}

		e.preventDefault();
		e.stopPropagation();

		return 0;
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

				img.src = browser.runtime.getURL("icons/icon.png"),
				img.title = `When you click on "${grabbed}" link,
I'll save it in the clipboard.
Use "⊞ Win + R" and paste the link there.`;

				notificationCenter.appendChild(img);
			}
		}
		catch (e) {
			console.error(e);
		}
	}

	function showNotification(title, message, type){
		if (!notificationCenter){
			console.error("There's no notifcation center element, cannot show notifcation 🥺");
			
			return;
		}

		if (!notification){
			notification = document.createElement("div");
			notificationCenter.appendChild(notification);
		}
		else{
			clearTimeout(notificationFadeTimer);
		}

		notification.className = `notification ${type}`;

		// clear childrens
		while(notification.firstChild){
			notification.removeChild(notification.firstChild)
		}

		// Add the title
		let lbl = document.createElement("label");
		lbl.className="titie";
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

	createNotifcationCenter();

	// Handle mouse down on the document (click is too late)
	window.addEventListener("mousedown", onMouseDown);

	// Update the anchors that the BM Creates
	setInterval(() => document.querySelectorAll("td a+a[href^=\\\\\\\\becks]").forEach(link => {
		const newRef = `file://${link.href.replace("\\", "/").replace(/http:\/\//i, "")}`;

		link.href = newRef;
		link.innerText = grabbed;
		link.dataset.link = newRef;
	}), pwnLinksInterval);
})();