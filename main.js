var message = [];
var loadedTutors = false;
var loadedSubmissions = false;
var zipEntries = null;
var tutors = null;
var tutorIndices = [];
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

$(function () {
    $("#randomizeTutors").click(function () {
        randomizeAndDisplayTutors();
    });
});

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
            result.sort((a, b) => a.filename.toLowerCase() > b.filename.toLowerCase() ? 1 : -1);
            zipEntries = result;
            console.log("Found " + entries.length + " entries in the zip!");

            let submissions = [];
            for (let i = 0; i < result.length; i++) {
                let curEntry = result[i];
                if (curEntry.directory) {
                    continue;
                }
                let curLevel = getFileLevel(curEntry.filename);
                // NOTE: it seems that allowing direct pdf uploads results in the sumbission files being directly stored in the 
                // downloaded zip (i.e. no indiviudal assignsubmission subfolders per student)
                //if (curLevel == 1) {
                submissions.push(curEntry.filename);
                //}
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
        return;
    }

    if (files.length > 1) {
        alert("You must only select a single file.");
        return;
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
        return;
    }

    if (files.length > 1) {
        alert("You must only select a single file.");
        return;
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
    let fileName = csvFile.name;
    if (!fileName.substr(fileName.lastIndexOf(".") + 1) == "csv") {
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

function randomizeAndDisplayTutors() {
    let tutorTableBody = $('#tutorTableBody');
    tutorTableBody.empty();

    // randomize the assignment order - i.e. such that each tutor gets a different set of people each time
    shuffleArray(tutorIndices);

    for (let i = 0; i < tutors.length; i++) {
        let tutorIdx = tutorIndices[i];
        let curTutor = tutors[tutorIdx];
        let tutorEntry = '<tr><th scope="row">' + (i + 1) + '</th><td><i class="bi bi-person-fill me-2"></i>' + curTutor.name + '</td><td>' + curTutor.weight + '</td></tr>';
        tutorTableBody.append(tutorEntry);
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

    // Valid tutor file found
    for (let tutorIdx = 0; tutorIdx < tutors.length; tutorIdx++) {
        tutorIndices.push(tutorIdx);
    }

    // Randomizing tutors
    randomizeAndDisplayTutors();

    let tutorFileDropBox = $('#tutorFileDropBox');
    tutorFileDropBox.addClass("d-none");


    let tutorTable = $('#tutorTable');
    tutorTable.removeClass("d-none");

    // display tutor count dialog
    let alertElem = $('#tutorCountDialog');
    alertElem.text("Found " + tutors.length + " tutors");
    alertElem.removeClass("d-none");

    loadedTutors = true;
    $("#randomizeTutors").removeAttr("disabled");
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
    $('#tutorZipBtn').prop('disabled', true);
    $('#generationSpinner').removeClass("d-none");
    let assignmentName = $('#assignmentName').val();
    if (!assignmentName || assignmentName.trim().length === 0) {
        $('#generationSpinner').addClass("d-none");
        alert("ERROR: assignment name is invalid!")
        return;
    }

    let fullSubmissionCountPerTutor = calcTutorAssignments();
    for (let j = 0; j < tutors.length; j++) {
        let tutorIdx = tutorIndices[j];
        let curTutor = tutors[tutorIdx];
        console.log(curTutor.name + " is assigned " + fullSubmissionCountPerTutor[tutorIdx] + " assignments");
    }

    let curStartIdx = 0;
    let fullTutorAssignments = "";
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
            const writtenZipInfo = await writer.add(curResult.filename, new zip.BlobReader(zipData));
            console.log("Tutor " + j + ": zip entry " + i + " : cur entry: offset: " + writtenZipInfo.offset + " compressedSize: " + writtenZipInfo.compressedSize);
        }
        let firstIncludedName = zipEntries[curStartIdx].filename;
        let lastIncludedName = zipEntries[curEndIdx - 1].filename;
        curStartIdx += fullSubmissionCountPerTutor[tutorIdx];

        let tutorAssignment = "From (including) \"" + extractNameFromFilename(firstIncludedName) + "\" to (including) \"" + extractNameFromFilename(lastIncludedName) + "\"";
        fullTutorAssignments += curTutor.name + ": " + tutorAssignment;
        if (j < tutors.length - 1) {
            fullTutorAssignments += '\n';
        }
        // add name range to zip file
        const nameBlob = new Blob(
            [tutorAssignment],
            { type: "text/plain" });
        await writer.add("nameRange.txt", new zip.BlobReader(nameBlob));

        const zipWriterResult = await writer.close();
        saveFile(assignmentName + "_" + curTutor.name.replace(/\s/, "_") + ".zip", zipWriterResult);
    }
    if (curStartIdx != zipEntries.length) {
        $('#generationSpinner').addClass("d-none");
        alert("ERROR - tutor assignment failed!");
        return;
    }
    const fullTutorAssignmentsBlob = new Blob(
        [fullTutorAssignments],
        { type: "text/plain" });
    saveFile(assignmentName + "_TutorAssignment.txt", fullTutorAssignmentsBlob);
    $('#tutorAssignmentId').prop('rows', tutors.length);
    $('#tutorAssignmentId').text(fullTutorAssignments);
    $('#result').removeClass("d-none");
    $('#generationSpinner').addClass("d-none");
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

    // we create a copy that we can manipulate (sort)
    // we also store the original index to create an array contianing the final values in the correct order
    let tutorArrCopy = [];
    for (let i = 0; i < tutors.length; i++) {
        // create shallow copy
        tutorCopy = Object.assign({}, tutors[i]);
        tutorCopy.originalIdx = i;
        tutorArrCopy.push(tutorCopy);
    }

    // we later need to decide which tutor to assign one of the remaining submissions when the sortVal is equal
    // then we want to assign it to the tutor with fewer weight
    // hence we just sort the tutors by weight ascending
    tutorArrCopy.sort((a, b) => a.weight - b.weight);

    let assignPriority = [];
    let cumulatedWeight = 0;
    for (const curTutor of tutorArrCopy) {
        cumulatedWeight += curTutor.weight;
        // the assign priority describes how much submissions a tutor has to correct per time unit
        assignPriority.push(1.0 / curTutor.weight);
    }
    // 1. step:  
    // calculate how much submissions is a tutor assigned per weight point
    let submissionWeightMultiplier = Math.floor(submissionCount / cumulatedWeight);
    let remainingSubmissionCount = submissionCount % cumulatedWeight;

    let additionalSubmissionsPerTutor = [];
    for (let i = 0; i < tutorArrCopy.length; i++) additionalSubmissionsPerTutor[i] = 0;

    // 2. step assign remaining submissions
    for (let i = 0; i < remainingSubmissionCount; i++) {
        let curMinPrio = Math.min(...assignPriority);
        let curMinPrioIdx = assignPriority.indexOf(curMinPrio);
        additionalSubmissionsPerTutor[curMinPrioIdx]++;
        // update priority
        assignPriority[curMinPrioIdx] = (additionalSubmissionsPerTutor[curMinPrioIdx] + 1) / tutorArrCopy[curMinPrioIdx].weight;
    }

    let fullSubmissionCountPerTutor = [];
    for (let i = 0; i < tutorArrCopy.length; i++) {
        let curTutor = tutorArrCopy[i];
        fullSubmissionCountPerTutor[curTutor.originalIdx] = curTutor.weight * submissionWeightMultiplier + additionalSubmissionsPerTutor[i];
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
