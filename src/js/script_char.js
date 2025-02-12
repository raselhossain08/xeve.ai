

window.onSearchButtonClicked = async function (event) {
    event.preventDefault();
    const searchTerm = document.getElementById("searchField").value;
    if (searchTerm === "") {
        return;
    }
    //redirect to main
    window.location.href = `${window.location.origin}/?search=${encodeURIComponent(searchTerm)}`;
}