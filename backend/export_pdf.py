
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable
)


def make_pdf(blog):
    output = BytesIO()

    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.7 * inch,
        bottomMargin=0.7 * inch
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "BlogTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=22,
        leading=28,
        textColor=colors.HexColor("#243b53"),
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        "BlogHeading1",
        parent=styles["Heading1"],
        spaceBefore=14,
        spaceAfter=8
    )

    h2_style = ParagraphStyle(
        "BlogHeading2",
        parent=styles["Heading2"],
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        "BlogBody",
        parent=styles["BodyText"],
        fontSize=10.5,
        leading=16,
        spaceAfter=8
    )

    story = [
        Paragraph(
            escape(blog.get("title") or "Untitled Blog"),
            title_style
        ),
        HRFlowable(
            width="100%",
            thickness=1,
            color=colors.HexColor("#bcccdc"),
            spaceAfter=16
        )
    ]

    for line in (blog.get("content") or "").splitlines():
        text = line.strip()

        if not text:
            story.append(Spacer(1, 5))
        elif text.startswith("### "):
            story.append(
                Paragraph(escape(text[4:]), styles["Heading3"])
            )
        elif text.startswith("## "):
            story.append(
                Paragraph(escape(text[3:]), h2_style)
            )
        elif text.startswith("# "):
            story.append(
                Paragraph(escape(text[2:]), h1_style)
            )
        elif text.startswith(("- ", "* ", "• ")):
            story.append(
                Paragraph(
                    "&#8226;&nbsp;&nbsp;" + escape(text[2:]),
                    body_style
                )
            )
        else:
            story.append(Paragraph(escape(text), body_style))

    def add_page_number(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 9)
        canvas.drawCentredString(
            A4[0] / 2,
            0.4 * inch,
            f"Page {doc.page}"
        )
        canvas.restoreState()

    document.build(
        story,
        onFirstPage=add_page_number,
        onLaterPages=add_page_number
    )

    output.seek(0)
    return output
