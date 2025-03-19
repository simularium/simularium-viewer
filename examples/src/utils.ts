/**
 * Validates and returns a URL if it matches the expected format
 */
export const validateUrl = (url: any): string => {
    if (typeof url !== "string") return "";

    // URL validation regex
    const urlRegex =
        /(https?:\/\/)([\w\-]){0,200}(\.[a-zA-Z][^\-])([\/\w]*)*\/?\??([^\n\r]*)?([^\n\r]*)/g;
    return urlRegex.test(url) ? url : "";
};

/**
 * Transforms URLs from common cloud storage services to direct download links
 */
export const getDownloadUrl = (url: string): string => {
    // Google Drive transformation
    if (/google\.com/g.test(url)) {
        const fileId = getFileIdentifier(url);
        if (fileId) {
            return `https://www.googleapis.com/drive/v2/files/${fileId}?alt=media&key=${process.env.GOOGLE_API_KEY}`;
        }
    }

    // Dropbox transformation
    if (url.includes("dropbox.com")) {
        return url.replace("dropbox.com", "dl.dropboxusercontent.com");
    }

    return url;
};

/**
 * Extracts file ID or name from various URL formats
 */
export const getFileIdentifier = (
    url: string,
    idParam?: string | string[] | null
): string => {
    // Handle Google Drive URLs
    if (/google\.com/g.test(url)) {
        // Use ID from query parameter if available (e.g., ?id=1HH5KBpH7QAiwqw-qfm0_tfkTO3XC8afR)
        if (idParam && typeof idParam === "string") {
            return idParam;
        }

        // Extract ID from drive.google.com/file/d/ URLs
        const driveMatch = url.match(
            /(?:drive\.google\.com\/file\/d\/)([^\/]+)/
        );
        if (driveMatch && driveMatch[1]) {
            return driveMatch[1];
        }

        return "";
    }

    // Extract filename from general URLs (e.g., mysite.com/myTraj.simularium?dl=0 -> myTraj.simularium)
    const urlSegments = url.split("/");
    return urlSegments[urlSegments.length - 1].split("?")[0];
};
