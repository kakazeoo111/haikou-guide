export function getHomePanelsLayoutStyles(isMobile) {
  const wrapStyle = {
    width: "100%",
    height: "100vh",
    display: "flex",
    flexDirection: isMobile ? "column" : "row-reverse",
    overflow: "hidden",
  };

  const mapPanelStyle = {
    width: isMobile ? "100%" : "auto",
    height: isMobile ? "30vh" : "100vh",
    flex: isMobile ? "none" : 1,
    minWidth: 0,
    position: "relative",
    zIndex: 10,
  };

  const listPanelStyle = {
    width: isMobile ? "100%" : "380px",
    height: isMobile ? "70vh" : "100vh",
    flex: isMobile ? "none" : "0 0 380px",
    overflowY: "auto",
    background: "white",
    zIndex: 15,
    padding: 0,
    boxSizing: "border-box",
  };

  return { wrapStyle, mapPanelStyle, listPanelStyle };
}
