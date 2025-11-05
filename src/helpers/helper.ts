import { docSathiService } from '../services/docsathiService';

class Helper {
  /**
   * Method to capitalize a string's first character
   * @param string any string
   * @returns The capitalized string
   */
  capitalize = (string: string) =>
    string?.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());

  capitalizeDropdownOptions = <T extends { label: string }>(
    options: Array<T>,
  ): Array<T> => {
    return options.map((option) => ({
      ...option,
      label: option.label.charAt(0).toUpperCase() + option.label.slice(1),
    }));
  };

  downloadFile = async (url: string): Promise<void> => {
    const file = await fetch(url);
    const fileBlob = await file.blob();
    const fileURL = URL.createObjectURL(fileBlob);

    const link = document.createElement("a");
    link.href = fileURL;
    const name = url
      .split("/")
      .pop()
      ?.split("?")[0]
      .replace(/%20/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
    link.download = name ?? "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  openDocumentInViewer = (url: string) => {
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
      url,
    )}`;
    window.open(officeViewerUrl, "_blank");
  };

  pushFileToS3 = async (
    signedUrl: string,
    file: Blob,
  ): Promise<Response | undefined> => {
    try {
      console.log("----sign------------", signedUrl);
      const myHeaders = new Headers({
        "Content-Type": file.type,
      });
      return await fetch(signedUrl, {
        method: "PUT",
        headers: myHeaders,
        body: file,
      });
    } catch (e: any) {
      return e;
    }
  };

  presignedUrl = async (fileFormat: string) => {
    const fileNameTime = `${fileFormat.split(".")[0]}_${new Date().getTime()}`;
    const response = await docSathiService.getPreSignedUrl({ fileFormat: fileNameTime });
    return { response, fileNameTime };
  };

  uploadFileOnS3 = async (fileOrFiles: File | File[]) => {
    const results: { signedUrl: string; fileNameTime: string }[] = [];

    if (Array.isArray(fileOrFiles)) {
      for (const file of fileOrFiles) {
        const { response, fileNameTime } = await helperInstance.presignedUrl(
          file.name,
        );

        if (response && response?.data) {
          const uploadResponse = await helperInstance.pushFileToS3(
            response?.data?.data ?? response?.data?.uploadUrl ?? response?.data,
            file,
          );
          
          if (uploadResponse?.ok) {
            // Get the file URL by removing query params from signed URL
            const fileUrl = (response?.data?.data ?? response?.data?.uploadUrl ?? response?.data).split("?")[0];
            results.push({
              signedUrl: fileUrl,
              fileNameTime,
            });
          }
        }
      }
    } else {
      const { response, fileNameTime } = await helperInstance.presignedUrl(
        fileOrFiles.name,
      );

      if (response && response?.data) {
        const uploadResponse = await helperInstance.pushFileToS3(
          response?.data?.data ?? response?.data?.uploadUrl ?? response?.data,
          fileOrFiles,
        );
        
        if (uploadResponse?.ok) {
          const fileUrl = (response?.data?.data ?? response?.data?.uploadUrl ?? response?.data).split("?")[0];
          results.push({
            signedUrl: fileUrl,
            fileNameTime,
          });
        }
      }
    }

    return results;
  };

  cleanFileName(fileName: string) {
    const parts = fileName.split("_");
    parts.pop();
    return parts.join("_");
  }
}

const helperInstance = new Helper();
export default helperInstance;

