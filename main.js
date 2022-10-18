var message = [];
var loadedTutors = false;
var loadedSubmissions = false;
var zipEntries = null;
var tutors = null;
if (isIE()) {
    message = '<p>This website does not support Internet Explorer, please use a BETTER browser.</p>';
    document.querySelector('body').innerHTML = message;
} else {
    if (!window.FileReader) {
        message = '<p>The ' +
            '<a href="http://dev.w3.org/2006/webapi/FileAPI/"        target="_blank">File API</a>s ' +
            'is not fully supported by this browser.</p>' +
            '<p>Please upgrade your browser to the latest version.</p>';
        document.querySelector('body').innerHTML = message;
    } else {
        // Set up the file drag and drop listeners:         
        document.getElementById('zipFileDropBox').addEventListener('dragover', handleDragOver, false);
        document.getElementById('zipFileDropBox').addEventListener('drop', handleZipFileSelection, false);
        document.getElementById('tutorFileDropBox').addEventListener('dragover', handleDragOver, false);
        document.getElementById('tutorFileDropBox').addEventListener('drop', handleCsvFileSelection, false);
    }
}

function isIE() {
    const ua = window.navigator.userAgent; //Check the userAgent property of the window.navigator object
    const msie = ua.indexOf('MSIE '); // IE 10 or older
    const trident = ua.indexOf('Trident/'); //IE 11

    return (msie > 0 || trident > 0);
}


function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
}

function startZipFileRead(fileObject) {
    const reader = new zip.ZipReader(new zip.BlobReader(fileObject));

    // get all entries from the zip
    const entries = reader.getEntries();
    entries.then(result => {
        if (result.length) {
            zipEntries = result;
            console.log("Found " + entries.length + " entries in the zip!");

            let submissions = [];
            for (let i = 0; i < result.length; i++) {
                let curEntry = result[i];
                if (curEntry.directory) {
                    continue;
                }
                let curLevel = getFileLevel(curEntry.filename);
                if (curLevel == 1) {
                    submissions.push(curEntry.filename);
                }
            }
            console.log("Found " + submissions.length + " submissions!");

            let zipFileName = fileObject.name;
            // german version
            let regexResult = zipFileName.match(/.*(Übung|UE|Exercise)(\s|-)*([0-9]+)/);
            if (regexResult != null && regexResult.length == 4) {
                let extractedName = regexResult[1];
                let extractedNumber = regexResult[3];
                $('#assignmentName').val(extractedName + "_" + extractedNumber);
            }
            /*
            let regexResult = zipFileName.match(/.*(Übung\s[0-9]+)/);
            if (regexResult.length != 2) {
                regexResult = zipFileName.match(/.*(Exercise\s[0-9]+)/);
            }
            if (regexResult.length == 2) {
                let extractedName = regexResult[1];
                extractedName = extractedName.replace(/\s/, "_");
                $('#assignmentName').val(extractedName);
            }
            */

            let zipFileDropBox = $('#zipFileDropBox');
            zipFileDropBox.addClass("d-none");

            let zipDisplay = $('#zipDisplay');
            zipDisplay.empty();
            let rootElemStr = '<li class="list-group-item"><i class="bi bi-file-earmark-zip"></i>' + fileObject.name + '</li>';
            zipDisplay.append(rootElemStr);

            let shownFileEntries;
            let addDotEntry = false;
            const MAX_SHOWN_SUBMISSIONS = 8;
            if (submissions.length > MAX_SHOWN_SUBMISSIONS) {
                shownFileEntries = MAX_SHOWN_SUBMISSIONS - 1;
                addDotEntry = true;
            } else {
                shownFileEntries = submissionCount;
            }
            for (let i = 0; i < shownFileEntries; i++) {
                let curSubmissionElemStr = '<li class="list-group-item"><div class="submission"><i class="bi bi-person-rolodex"></i><div style="display:inline;">' + submissions[i] + '</div></div></li>';
                zipDisplay.append(curSubmissionElemStr);
            }
            if (addDotEntry) {
                let dotElemStr = '<li class="list-group-item"><div class="submission"><i class="bi bi-person-rolodex"></i><div style="display:inline;">...</div></div></li>';
                zipDisplay.append(dotElemStr);
            }
            zipDisplay.removeClass("d-none");


            // display submission count dialog
            let alertElem = $('#submissionCountDialog');
            alertElem.text("Found " + submissions.length + " submissions");
            alertElem.removeClass("d-none");

            loadedSubmissions = true;
            enableStep3IfReady();
        }

        // close the ZipReader
        reader.close();
    });
}

function saveFile(name, blob) {
    var a = $("<a style='display: none;'/>");
    var url = window.URL.createObjectURL(blob);
    a.attr("href", url);
    a.attr("download", name);
    $("body").append(a);
    a[0].click();
    window.URL.revokeObjectURL(url);
    a.remove();
}

function getFileLevel(filename) {
    var result = 0;
    for (let i = 0; i < filename.length; i++) if (filename[i] == '/') result++;
    return result;
}

function handleZipFileSelection(evt) {
    evt.stopPropagation(); // Do not allow the drop event to bubble.
    evt.preventDefault(); // Prevent default drop event behavior.

    var files = evt.dataTransfer.files; // Grab the list of files dragged to the drop box.

    if (!files) {
        alert("<p>At least one selected file is invalid - do not select any folders.</p><p>Please reselect and try again.</p>");
        return;
    }

    if (files.length == 0) {
        alert("No files selected.");
    }

    if (files.length > 1) {
        alert("You must only select a single file.");
    }

    var zipFile = files[0];
    if (!zipFile) {
        alert("Unable to access " + zipFile.name);
        return;
    }
    if (zipFile.size == 0) {
        alert("Skipping " + zipFile.name.toUpperCase() + " because it is empty.");
        return;
    }
    if (!(zipFile.type.match('application/x-zip-compressed') || zipFile.type.match('application/zip'))) {
        alert("Skipping " + zipFile.name.toUpperCase() + " because it is not a zip file.");
        return;
    }
    startZipFileRead(zipFile);
}

function handleCsvFileSelection(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files;

    if (!files) {
        alert("<p>At least one selected file is invalid - do not select any folders.</p><p>Please reselect and try again.</p>");
        return;
    }

    if (files.length == 0) {
        alert("No files selected.");
    }

    if (files.length > 1) {
        alert("You must only select a single file.");
    }

    var csvFile = files[0];
    if (!csvFile) {
        alert("Unable to access " + csvFile.name);
        return;
    }
    if (csvFile.size == 0) {
        alert("Skipping " + csvFile.name.toUpperCase() + " because it is empty.");
        return;
    }
    if (!csvFile.type.match('text/csv')) {
        alert("Skipping " + csvFile.name.toUpperCase() + " because it is not a csv file.");
        return;
    }
    startCsvFileRead(csvFile);
}

function startCsvFileRead(fileObject) {
    var reader = new FileReader();
    reader.onloadend = handleCsvContent;
    reader.abort = handleFileReadAbort;
    reader.onerror = handleFileReadError;

    if (fileObject) {
        reader.readAsText(fileObject);
    }
}

function handleCsvContent(evt) {
    var test = evt.target.result;
    var lines = test.split(/\r?\n/).filter(e => e);
    let includesComma = lines[0].includes(",")
    let includesSemicolon = lines[0].includes(";")
    if (includesComma && includesSemicolon) {
        alert("ERROR: CSV file contains both comma and semicolon")
        return;
    } else if (!includesComma && !includesSemicolon) {
        alert("ERROR: CSV file contains neither comma and semicolon")
        return;
    }

    let splitChar = includesComma ? "," : ";";

    tutors = [];
    for (const line of lines) {
        let values = line.split(splitChar);
        if (values.length != 2) {
            alert("ERROR: Tutor must be specified in 2 columns: name and weight")
            return;
        }
        let curTutor = {
            name: values[0],
            weight: Number.parseInt(values[1])
        }
        tutors.push(curTutor);
    }
    if (tutors.length < 1) {
        alert("ERROR: No tutors found in the file!")
        return;
    }

    let tutorFileDropBox = $('#tutorFileDropBox');
    tutorFileDropBox.addClass("d-none");

    let tutorTableBody = $('#tutorTableBody');
    tutorTableBody.empty();

    for (let i = 0; i < tutors.length; i++) {
        let curTutor = tutors[i];
        let tutorEntry = '<tr><th scope="row">' + (i + 1) + '</th><td><i class="bi bi-person-fill me-2"></i>' + curTutor.name + '</td><td>' + curTutor.weight + '</td></tr>';
        tutorTableBody.append(tutorEntry);
    }

    let tutorTable = $('#tutorTable');
    tutorTable.removeClass("d-none");

    // display tutor count dialog
    let alertElem = $('#tutorCountDialog');
    alertElem.text("Found " + tutors.length + " tutors");
    alertElem.removeClass("d-none");

    loadedTutors = true;
    enableStep3IfReady();
}

function enableStep3IfReady() {
    if (loadedSubmissions && loadedTutors) {
        let thirdStep = $('#thirdStep');
        thirdStep.removeClass("d-none");
        $('#tutorZipBtn').click(handleGenerateZipsBtn);
    }
}

async function handleGenerateZipsBtn() {
    let assignmentName = $('#assignmentName').val();
    if (!assignmentName || assignmentName.trim().length === 0) {
        alert("ERROR: assignment name is invalid!")
        return;
    }

    let fullSubmissionCountPerTutor = calcTutorAssignments();
    console.log(fullSubmissionCountPerTutor);

    // randomize the assignment order - i.e. such that each tutor gets a different set of people each time
    let tutorIndices = [];
    for (let tutorIdx = 0; tutorIdx < tutors.length; tutorIdx++) {
        tutorIndices.push(tutorIdx);
    }
    shuffleArray(tutorIndices);

    let curStartIdx = 0;
    for (let j = 0; j < tutors.length; j++) {
        let tutorIdx = tutorIndices[j];
        let curTutor = tutors[tutorIdx];
        const blobWriter = new zip.BlobWriter("application/zip");
        const writer = new zip.ZipWriter(blobWriter);
        let curEndIdx = curStartIdx + fullSubmissionCountPerTutor[tutorIdx];
        for (let i = curStartIdx; i < curEndIdx; i++) {
            let curResult = zipEntries[i];
            const textWriter = new zip.BlobWriter();
            const zipData = await curResult.getData(textWriter);
            await writer.add(curResult.filename, new zip.BlobReader(zipData));
        }
        let firstIncludedName = zipEntries[curStartIdx].filename;
        let lastIncludedName = zipEntries[curEndIdx - 1].filename;
        curStartIdx += fullSubmissionCountPerTutor[tutorIdx];

        // add name range to zip file
        const nameBlob = new Blob(
            ["From (including) \"" + extractNameFromFilename(firstIncludedName) + "\" to (including) \"" + extractNameFromFilename(lastIncludedName) + "\""],
            { type: "text/plain" });
        await writer.add("nameRange.txt", new zip.BlobReader(nameBlob));

        const zipWriterResult = await writer.close();
        saveFile(assignmentName + "_" + curTutor.name.replace(/\s/, "_") + ".zip", zipWriterResult);
    }
    if (curStartIdx != zipEntries.length) {
        alert("ERROR - tutor assignment failed!");
    }
}

function extractNameFromFilename(filename) {
    return filename.substr(0, filename.indexOf("_"));
}

/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function calcTutorAssignments() {
    let submissionCount = zipEntries.length;

    // we later need to decide which tutor to assign one of the remaining submissions when the sortVal is equal
    // then we want to assign it to the tutor with fewer weight
    // hence we just sort the tutors by weight ascending
    tutors.sort((a, b) => a.weight - b.weight);

    let assignPriority = [];
    let cumulatedWeight = 0;
    for (const curTutor of tutors) {
        cumulatedWeight += curTutor.weight;
        // the assign priority describes how much submissions a tutor has to correct per time unit
        assignPriority.push(1.0 / curTutor.weight);
    }
    // 1. step:  
    // calculate how much submissions is a tutor assigned per weight point
    let submissionWeightMultiplier = Math.floor(submissionCount / cumulatedWeight);
    let remainingSubmissionCount = submissionCount % cumulatedWeight;

    let additionalSubmissionsPerTutor = [];
    for (let i = 0; i < tutors.length; i++) additionalSubmissionsPerTutor[i] = 0;

    // 2. step assign remaining submissions
    for (let i = 0; i < remainingSubmissionCount; i++) {
        let curMinPrio = Math.min(...assignPriority);
        let curMinPrioIdx = assignPriority.indexOf(curMinPrio);
        additionalSubmissionsPerTutor[curMinPrioIdx]++;
        // update priority
        assignPriority[curMinPrioIdx] = (additionalSubmissionsPerTutor[curMinPrioIdx] + 1) / tutors[curMinPrioIdx].weight;
    }

    let fullSubmissionCountPerTutor = [];
    for (let i = 0; i < tutors.length; i++) {
        fullSubmissionCountPerTutor[i] = tutors[i].weight * submissionWeightMultiplier + additionalSubmissionsPerTutor[i];
    }
    return fullSubmissionCountPerTutor;
}

function handleFileReadAbort(evt) {
    alert("File read aborted.");
}

function handleFileReadError(evt) {
    var message;
    switch (evt.target.error.name) {
        case "NotFoundError":
            alert("The file could not be found at the time the read was processed.");
            break;
        case "SecurityError":
            message = "<p>A file security error occured. This can be due to:</p>";
            message += "<ul><li>Accessing certain files deemed unsafe for Web applications.</li>";
            message += "<li>Performing too many read calls on file resources.</li>";
            message += "<li>The file has changed on disk since the user selected it.</li></ul>";
            alert(message);
            break;
        case "NotReadableError":
            alert("The file cannot be read. This can occur if the file is open in another application.");
            break;
        case "EncodingError":
            alert("The length of the data URL for the file is too long.");
            break;
        default:
            alert("File error code " + evt.target.error.name);
    }
} 